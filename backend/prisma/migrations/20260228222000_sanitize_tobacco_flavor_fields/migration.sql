UPDATE "Tobacco" AS t
SET
  "flavorTags" = COALESCE(
    (
      SELECT ARRAY(
        SELECT DISTINCT normalized
        FROM (
          SELECT
            CASE
              WHEN raw_tag ~ 'редк' THEN 'редкие'
              WHEN raw_tag ~ 'напит|газиров|алког' THEN 'напитки'
              WHEN raw_tag ~ 'мят|ментол|холод|лед' THEN 'охлаждающий'
              ELSE NULL
            END AS normalized
          FROM (
            SELECT lower(trim(tag_value)) AS raw_tag
            FROM unnest(COALESCE(t."flavorTags", ARRAY[]::TEXT[])) AS tag_value
          ) AS src
        ) AS mapped
        WHERE normalized IS NOT NULL
      )
    ),
    ARRAY[]::TEXT[]
  ),
  "flavors" = COALESCE(
    (
      SELECT ARRAY(
        SELECT DISTINCT raw_flavor
        FROM (
          SELECT lower(trim(flavor_value)) AS raw_flavor
          FROM unnest(COALESCE(t."flavors", ARRAY[]::TEXT[])) AS flavor_value
        ) AS src
        WHERE raw_flavor <> ''
          AND raw_flavor !~ 'редк|напит|газиров|алког|мят|ментол|холод|лед'
          AND raw_flavor !~ 'цветоч|травян|цитрус|ягод|фрукт|табач|десерт|пря|парфюм|вкусы'
      )
    ),
    ARRAY[]::TEXT[]
  );
