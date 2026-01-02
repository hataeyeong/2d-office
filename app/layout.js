import './globals.css';

export const metadata = {
    title: '2D Virtual Office - Gather Town Style',
    description: '2D 픽셀 아트 가상 오피스',
};

export default function RootLayout({ children }) {
    return (
        <html lang="ko">
            <body>{children}</body>
        </html>
    );
}
