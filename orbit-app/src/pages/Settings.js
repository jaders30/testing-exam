import React, { useContext, useState } from "react";
import PageTitle from "../components/common/PageTitle";
import * as Yup from "yup";
import FormInput from "../components/FormInput";
import Card from "./../components/common/Card";
import GradientButton from "../components/common/GradientButton";
import { Formik, Form } from "formik";
import { FetchContext } from "./../context/FetchContext";
import FormError from "./../components/FormError";
import FormSuccess from "./../components/FormSuccess";
import { AuthContext } from "../context/AuthContext";
const passwordChangeSchema = (firstName, lastName) =>
  Yup.object().shape({
    password: Yup.string()
      .matches(/(?=.*[a-z])/, "One lowercase required")
      .matches(/(?=.*[A-Z])/, "One uppercase required")
      .matches(/(?=.*[0-9])/, "One number required")
      .matches(/(?=.*[!@#$%^&*])/, "One special character required")
      .test("test1", "Password must not contain username", function (val) {
        return !(val.indexOf(firstName) !== -1);
      })
      .test("test2", "Password must not contain lastname", function (val) {
        return !(val.indexOf(lastName) !== -1);
      })
      .min(10, "Minimum of 10 Characters")
      .required("Password is required"),
    passwordConfirm: Yup.string()
      .oneOf([Yup.ref("password")], "Password must be the same!")
      .required("Required!"),
  });

const Settings = () => {
  const fetchContext = useContext(FetchContext);
  const authContext = useContext(AuthContext);
  const [password, setPassword] = useState();
  const { token, expiresAt, userInfo } = authContext.authState;
  const [successMessagePassword, setSuccessMessagePassword] = useState();
  const [errorMessagePassword, setErrorMessagePassword] = useState();

  const savePassword = async (pass) => {
    try {
      const { data } = await fetchContext.authAxios.patch(
        "changePassword",
        pass
      );
      setErrorMessagePassword(null);
      setSuccessMessagePassword(data.message);
    } catch (err) {
      const { data } = err.response;
      setSuccessMessagePassword(null);
      setErrorMessagePassword(data.message);
    }
  };

  return (
    <>
      <PageTitle title="Settings" />
      <Card>
        <h2 className="font-bold mb-2">Change Your Password</h2>
        {successMessagePassword && (
          <FormSuccess text={successMessagePassword} />
        )}
        {errorMessagePassword && <FormError text={errorMessagePassword} />}
        <Formik
          initialValues={{ password }}
          onSubmit={(values) => savePassword(values)}
          enableReinitialize={true}
          validationSchema={() =>
            passwordChangeSchema(userInfo.firstName, userInfo.lastName)
          }
        >
          {() => (
            <Form>
              <div>
                <div className="mb-2 ml-2 w-full">
                  <FormInput
                    ariaLabel="Password"
                    name="password"
                    type="password"
                    placeholder="New Password"
                  />
                </div>
                <div className="mb-2 ml-2 w-full">
                  <FormInput
                    ariaLabel="Password"
                    name="passwordConfirm"
                    type="password"
                    placeholder="Confirm Password"
                  />
                </div>
                <div className="mt-6">
                  <GradientButton text="Save" type="submit" />
                </div>
              </div>
            </Form>
          )}
        </Formik>
      </Card>
    </>
  );
};

export default Settings;
