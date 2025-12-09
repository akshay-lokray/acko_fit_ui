declare module "@react-oauth/google" {
  export type UseGoogleLoginArgs = {
    flow?: "implicit" | "auth-code";
    scope?: string;
    onSuccess: (codeResponse: { code: string }) => void;
    onError: (error: unknown) => void;
  };

  export function useGoogleLogin(config: UseGoogleLoginArgs): () => void;
}

