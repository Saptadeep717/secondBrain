import { useRef } from "react";
import AuthComponent from "../components/Auth/AuthComponent";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setLoading } from "../utils/Redux/Slices/userSlice";
import axios from "axios";
import toast from "react-hot-toast";
const Signup = () => {
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  async function signupUser() {
      try {
      dispatch(setLoading(true));

      const username = usernameRef.current?.value?.trim();
      const password = passwordRef.current?.value?.trim();

      if (!username || !password) {
        toast.error("Please enter both username and password.");
        dispatch(setLoading(false));
        return;
      }

      const response = await axios.post(`/api/v1/signup`, {
        username,
        password,
      });

      const impData = response.data;
      console.log("Signup Response:", impData);

      if (impData.statusCode === 201) {
        toast.success("Signup successful!");
        navigate("/login");
      } else {
        toast.error(impData.message || "Signup failed. Please try again.");
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
      title="signup"
      usernameRef={usernameRef}
      passwordRef={passwordRef}
      onSubmit={signupUser}
      key={1}
    />
  );
};

export default Signup;
