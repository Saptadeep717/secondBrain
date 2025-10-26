import { useRef } from "react";
import AuthComponent from "../components/Auth/AuthComponent";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  setLoading,
  setSignupData,
  setToken,
} from "../utils/Redux/Slices/userSlice";

import toast from "react-hot-toast";
const Login = () => {
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  

  async function loginUser() {
    try {
      dispatch(setLoading(true));

      const username = usernameRef.current?.value?.trim();
      const password = passwordRef.current?.value?.trim();

      if (!username || !password) {
        toast.error("Please enter both username and password.");
        dispatch(setLoading(false));
        return;
      }

      const response = await axios.post(`/api/v1/login`, {
        username,
        password,
      });

      const impData = response.data;
      console.log("Login Response:", impData);

      if (impData.statusCode === 200 && impData?.data?.token) {
        dispatch(setSignupData(impData.data.user || {})); // if backend sends user info
        dispatch(setToken(impData.data.token));

        toast.success("Login successful!");
        navigate("/dashboard");
      } else {
        toast.error(impData.message || "Login failed. Please try again.");
      }
    } catch (err: any) {
      console.error("Login Error:", err);
      toast.error(
        err.response?.data?.message ||
          "An error occurred while logging in. Please try again."
      );
    } finally {
      dispatch(setLoading(false));
    }
  }
  return (
    <AuthComponent
      usernameRef={usernameRef}
      passwordRef={passwordRef}
      onSubmit={loginUser}
      title="login"
      key={2}
    />
  );
};

export default Login;
