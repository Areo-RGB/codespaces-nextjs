import '../styles/globals.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import type { AppProps } from 'next/app';

export default function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
