interface User {
  uid: string;
  displayName?: string;
  email: string;
  avatar?: string;
}

interface ErrorResponse {
  status: string;
  error: {
    code: string;
    message: string;
  };
}

interface ApiResponse<T> {
  status: string;
  message: string;
  data: T;
  status_code: number;
}

type Profile = {
  displayName: string;
  email: string;
  avatar?: string;
};
