import { useEffect, type RefObject } from "react";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { useSelector } from "react-redux";
import type { RootState } from "../../utils/Redux/Store";
import { Link } from "react-router-dom";
import Brainicon from "../../icons/Brainicon";

interface AuthComponentProps {
  title: "login" | "signup";
  usernameRef: RefObject<HTMLInputElement | null>;
  passwordRef: RefObject<HTMLInputElement | null>;
  onSubmit: () => void;
}

const info = {
  login: {
    text: "doesn't have an account,",
    to: "signup",
  },
  signup: {
    text: "already have an account,",
    to: "login",
  },
};

const commonClass: string = "text-sm italic text-purple-601";

const AuthComponent = ({
  title,
  usernameRef,
  passwordRef,
  onSubmit,
}: AuthComponentProps) => {
  const { loading } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        onSubmit();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className=" bg-[url(/bg_one.svg)] bg-cover bg-center fixed inset-0 flex items-center justify-center z-50">
      <div
        className="absolute top-16 flex items-center justify-center
       select-none"
      >
        <Brainicon size="4xl" props={"text-white"} />{" "}
        <span className="text-5xl text-white  ml-1 mb-1 font-semibold">
          2nd Brain
        </span>
      </div>
      <div
        className="flex flex-col items-center gap-4 p-6 border border-slate-200
      rounded-xl shadow-sm shadow-white w-80 lg:w-90 mx-auto bg-off-white"
      >
        <h2 className="text-2xl font-semibold text-center mb-2 capitalize">
          {title}
        </h2>

        <Input placeholder="Username" reference={usernameRef} props="w-full" />
        <Input
          placeholder="Password"
          reference={passwordRef}
          props="w-full"
          type="password"
        />

        <div>
          <Button
            variant="primary"
            text={title}
            onClick={onSubmit}
            loading={loading}
          />
        </div>

        <div className={commonClass}>
          <span>{info[title].text}</span>
          <Link to={`/${info[title].to}`}>{info[title].to}</Link>
        </div>
      </div>
    </div>
  );
};

export default AuthComponent;
