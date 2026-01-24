import os
from datetime import datetime, timezone

import numpy as np
import psycopg2
from psycopg2.extras import execute_values
from lightfm import LightFM
from scipy.sparse import coo_matrix
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    raise SystemExit('DATABASE_URL is required')

MODEL_VERSION = os.environ.get('MODEL_VERSION') or datetime.now(timezone.utc).isoformat()
TOP_N = int(os.environ.get('TOP_N', '50'))
EPOCHS = int(os.environ.get('EPOCHS', '30'))
NO_COMPONENTS = int(os.environ.get('NO_COMPONENTS', '32'))


def fetch_all(cursor, query, params=None):
    cursor.execute(query, params or ())
    return cursor.fetchall()


def main():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    users = fetch_all(cur, 'SELECT id FROM "User" ORDER BY createdAt ASC')
    mixes = fetch_all(cur, 'SELECT id FROM "Mix" ORDER BY createdAt ASC')

    if not users or not mixes:
        print('No users or mixes found. Skipping training.')
        return

    user_ids = [row[0] for row in users]
    mix_ids = [row[0] for row in mixes]
    user_index = {user_id: idx for idx, user_id in enumerate(user_ids)}
    mix_index = {mix_id: idx for idx, mix_id in enumerate(mix_ids)}

    session_rows = fetch_all(
        cur,
        '''
        SELECT s."userId", s."mixId",
               COUNT(s.id) AS sessions_count,
               AVG(sr.rating) AS avg_rating
        FROM "SmokingSession" s
        LEFT JOIN "SessionRating" sr
          ON sr."sessionId" = s.id AND sr."userId" = s."userId"
        GROUP BY s."userId", s."mixId"
        '''
    )

    direct_rows = fetch_all(
        cur,
        '''
        SELECT "userId", "mixId", rating
        FROM "MixRating"
        WHERE source = 'direct'
        '''
    )

    weights = {}
    for user_id, mix_id, sessions_count, avg_rating in session_rows:
        base = float(sessions_count)
        if avg_rating is not None:
            base += (float(avg_rating) - 3.0) * 0.5
        weights[(user_id, mix_id)] = max(0.1, base)

    for user_id, mix_id, rating in direct_rows:
        base = weights.get((user_id, mix_id), 0.1)
        base += (float(rating) - 3.0)
        weights[(user_id, mix_id)] = max(0.1, base)

    if not weights:
        print('No interactions found. Skipping training.')
        return

    rows = []
    cols = []
    data = []
    for (user_id, mix_id), weight in weights.items():
        if user_id not in user_index or mix_id not in mix_index:
            continue
        rows.append(user_index[user_id])
        cols.append(mix_index[mix_id])
        data.append(weight)

    interactions = coo_matrix((np.ones(len(data)), (rows, cols)), shape=(len(user_ids), len(mix_ids)))
    sample_weights = coo_matrix((np.array(data), (rows, cols)), shape=(len(user_ids), len(mix_ids)))

    model = LightFM(no_components=NO_COMPONENTS, loss='warp')
    model.fit(interactions, sample_weight=sample_weights, epochs=EPOCHS, num_threads=4)

    recommendations = []
    interactions_csr = interactions.tocsr()
    for user_id, u_index in user_index.items():
        scores = model.predict(u_index, np.arange(len(mix_ids)))
        known_items = set(np.where(interactions_csr[u_index].toarray()[0] > 0)[0])
        scores[list(known_items)] = -np.inf

        top_indices = np.argpartition(-scores, min(TOP_N, len(scores) - 1))[:TOP_N]
        top_indices = top_indices[np.argsort(-scores[top_indices])]

        for idx in top_indices:
            if scores[idx] == -np.inf:
                continue
            recommendations.append(
                (
                    user_id,
                    mix_ids[idx],
                    float(scores[idx]),
                    MODEL_VERSION,
                    datetime.now(timezone.utc),
                )
            )

    if not recommendations:
        print('No recommendations generated.')
        return

    conn.autocommit = False
    cur.execute('DELETE FROM "Recommendation"')

    execute_values(
        cur,
        'INSERT INTO "Recommendation" ("userId", "mixId", "score", "modelVersion", "computedAt") VALUES %s',
        recommendations,
    )
    conn.commit()

    print(f'Inserted {len(recommendations)} recommendations. Model version: {MODEL_VERSION}')


if __name__ == '__main__':
    main()
