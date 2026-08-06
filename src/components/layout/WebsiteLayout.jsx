import Header from "./Header";
import Footer from "./Footer";

export default function WebsiteLayout({ children }) {
  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
}