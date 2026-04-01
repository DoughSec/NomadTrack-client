/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly REACT_APP_API_URL?: string
  readonly VITE_AWS_REGION?: string
  readonly VITE_AWS_LEX_BOT_ID?: string
  readonly VITE_AWS_LEX_BOT_ALIAS_ID?: string
  readonly VITE_AWS_LEX_LOCALE_ID?: string
  readonly VITE_AWS_BEDROCK_AGENT_ID?: string
  readonly VITE_AWS_BEDROCK_AGENT_ALIAS_ID?: string
  readonly VITE_AWS_ACCESS_KEY_ID?: string
  readonly VITE_AWS_SECRET_ACCESS_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
