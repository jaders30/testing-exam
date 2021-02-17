import React, { useContext } from "react";
import { AuthContext } from "./../context/AuthContext";

const hStyle = { color: "red" };
const AuthStateItem = ({ title, value, note }) => (
  <div className="text-sm">
    <p className="font-bold mb-2">{title}</p>
    <p className="font-italic mb-2" style={hStyle}>
      {note}
    </p>
    <pre className="whitespace-pre-wrap bg-gray-100 p-2 rounded">
      <code className="break-all">{value}</code>
    </pre>
  </div>
);

const AuthDebugger = () => {
  const authContext = useContext(AuthContext);
  const { token, expiresAt, userInfo } = authContext.authState;
  const expiryDate = new Date(expiresAt * 1000);

  const beki = new Date(userInfo.passwordExpr);
  beki.setDate(beki.getDate() - 10);
  const passwordExpireLast = new Date(userInfo.passwordExpr);
  return (
    <section className="rounded-lg shadow bg-white p-4">
      <div className="mb-2">
        <AuthStateItem title="Token" value={token} />
      </div>
      <div className="mb-2">
        <AuthStateItem
          title="Token Expire at"
          value={expiryDate.toUTCString()}
        />
      </div>
      <div className="mb-2">
        <AuthStateItem
          title="ADVANCED NOTIFICATION: YOU WILL BE REMINDED VIA YOUR EMAIL"
          value={beki.toUTCString()}
        />
      </div>
      <div className="mb-2">
        <AuthStateItem
          title="PASSWORD EXPIRATION UNTIL"
          note="Note: You will be redirected to Change Password Page Please Change your password to have better security"
          value={passwordExpireLast.toUTCString()}
        />
      </div>
      <div className="mb-2">
        <AuthStateItem
          title="User Info"
          value={JSON.stringify(userInfo, null, 2)}
        />
      </div>
    </section>
  );
};

export default AuthDebugger;
