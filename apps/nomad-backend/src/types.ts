export type ApiError = {
  error: string;
};

export type GuestAccessSuccess = {
  ok: true;
  accessGranted: true;
  message: string;
  issuedAt: string;
  nextStep: 'intro' | 'onboarding';
};

export type StaffAuthResponse = {
  accessToken: string;
  tokenType: 'Bearer';
  user: {
    login: string;
    name: string;
    role: 'admin' | 'nomad';
  };
};
