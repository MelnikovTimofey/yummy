// Реплика мастера над чашей. Пока реплик не было, блок не рендерится вовсе и
// не занимает места на экране свайпов.
export function MasterLine({ line }: { line: string | null }) {
  if (!line) {
    return null;
  }
  return (
    <div className="mixer-master-line">
      <span className="mixer-master-avatar" aria-hidden>
        М
      </span>
      <div className="mixer-master-body">
        <span className="aroma-caps">Мастер</span>
        <span aria-live="polite">
          <span key={line} className="mixer-master-text">
            {line}
          </span>
        </span>
      </div>
    </div>
  );
}
