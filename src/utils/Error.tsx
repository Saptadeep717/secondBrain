import { useNavigate } from "react-router-dom";
const Error = () => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col">
      <div
        className="text-[12rem] font-semibold 
      hover:drop-shadow-[0_0px_15px_rgba(239,68,68,1)]
      transition-all text-center mt-[9.5%] select-none text-red-500 "
      >
        404 Not Found
      </div>
      <button
        className="self-center rounded-lg mt-16
      hover:drop-shadow-[0px_0px_2px_rgba(0,0,0,1)]
      transition-all p-3 text-3xl"
        onClick={() => {
          navigate(-1);
        }}
      >
        Back
      </button>
    </div>
  );
};

export default Error;
