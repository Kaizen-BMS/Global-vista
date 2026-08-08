// Login/Forgot Password/Reset Password no longer navigate between each
// other as separate routes — AuthFlow renders all three from client state
// inside one persistent component and owns the slide transition itself.
// This layout just needs to exist so the (auth) route group compiles.
export default function AuthLayout({ children }) {
  return children;
}
