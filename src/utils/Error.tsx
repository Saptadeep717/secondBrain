import { useNavigate } from "react-router-dom";
const Error = () => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col h-screen w-screen bg-[url(/404.svg)] bg-center bg-no-repeat">
      <button
        className="self-center rounded-lg mt-16 bg-slate-200
      p-1 text-3xl"
        onClick={() => {
          navigate('/login');
        }}
      >
        Back
      </button>
    </div>
  );
};

export default Error;
