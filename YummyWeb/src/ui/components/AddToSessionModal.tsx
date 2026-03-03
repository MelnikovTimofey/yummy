import { useState } from 'react';

import { AppButton, AppInput, AppModal } from '@/ui-kit';

type AddToSessionModalProps = {
  open: boolean;
  mixName?: string;
  submitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: { locationType: 'home' | 'lounge'; locationName?: string }) => Promise<void> | void;
};

export const AddToSessionModal = ({
  open,
  mixName,
  submitting = false,
  onOpenChange,
  onSubmit,
}: AddToSessionModalProps) => {
  const [locationType, setLocationType] = useState<'home' | 'lounge'>('home');
  const [locationName, setLocationName] = useState('');

  const canSubmit =
    !submitting && (locationType === 'home' || locationName.trim().length > 0);

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }
    await onSubmit({
      locationType,
      locationName: locationType === 'lounge' ? locationName.trim() : undefined,
    });
  };

  return (
    <AppModal
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setLocationType('home');
          setLocationName('');
        }
        onOpenChange(next);
      }}
      title="Добавить в сессию"
      contentClassName="session-add-modal"
      contentTestId="add-to-session-modal"
    >
      <div className="session-add-form">
        <p className="hint">
          Микс: <b>{mixName ?? 'не выбран'}</b>
        </p>
        <div className="location-switch">
          <AppButton
            variant="ghost"
            className={`location-btn ${locationType === 'home' ? 'active' : ''}`}
            onClick={() => setLocationType('home')}
          >
            Дом
          </AppButton>
          <AppButton
            variant="ghost"
            className={`location-btn ${locationType === 'lounge' ? 'active' : ''}`}
            onClick={() => setLocationType('lounge')}
          >
            Лаунж
          </AppButton>
        </div>
        {locationType === 'lounge' ? (
          <AppInput
            className="search-input"
            value={locationName}
            onChange={(event) => setLocationName(event.target.value)}
            placeholder="Название лаунжа"
          />
        ) : null}
        <AppButton
          className="search-button session-submit"
          onClick={() => void handleSubmit()}
          disabled={!canSubmit}
          data-testid="add-to-session-submit"
        >
          {submitting ? 'Добавляем...' : 'Добавить в сессию'}
        </AppButton>
      </div>
    </AppModal>
  );
};
