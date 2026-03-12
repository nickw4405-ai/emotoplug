export const metadata = {
  title: 'eMotoFetch — Top Quality Mods for Less',
};

export default function RootLayout({ children }) {
  const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1.0" />
        <link rel="stylesheet" href="/style.css" />
        {stripeKey && (
          <>
            {/* eslint-disable-next-line @next/next/no-sync-scripts */}
            <script src="https://js.stripe.com/v3/" />
            <script
              dangerouslySetInnerHTML={{ __html: `window.STRIPE_KEY="${stripeKey}";` }}
            />
          </>
        )}
      </head>
      <body>
        {children}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="/app.js" defer />
      </body>
    </html>
  );
}
