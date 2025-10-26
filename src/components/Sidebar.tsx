import { useDispatch } from "react-redux";
import { Brainicon } from "../icons/Brainicon";
import { Exiticon } from "../icons/Exiticon";
import { Twittericon } from "../icons/Twittericon";
import Youtubeicon from "../icons/Youtubeicon";
import { setLoading, setToken } from "../utils/Redux/Slices/userSlice";
import SidebarItems from "./SidebarItems";
import { Button } from "./ui/Button";
import toast from "react-hot-toast";
import { Documenticon } from "../icons/Documenticon";

const Sidebar = () => {
  const dispatch = useDispatch();
  function logoutUser() {
    try {
      dispatch(setLoading(true));
      dispatch(setToken(null));
      toast.success("Logout Successful");
      dispatch(setLoading(false));
    } catch (error) {
      toast.error("Logout Failed");
    }
  }
  return (
    <div
      className="border-r-2  border-slate-200 lg:w-72 
      h-screen bg-off-white fixed left-0 top-0 flex flex-col items-center
      "
    >
      <div className="header w-full p-4 hover:bg-slate-100 transition duration-150 hover:ease-in">
        <span className="flex items-center gap-2 font-semibold text-2xl">
          <span>
            <Brainicon size="2xl" props={`text-purple-800`} />
          </span>
          <span className="select-none">Second Brain</span>
        </span>
      </div>
      <div className="bullets px-5 py-6 flex-col items-center gap-4">
        <SidebarItems
          addProps={itemsProp}
          icon={<Twittericon props={"font-bold"} size={"md"} />}
          title={"Twitter Links"}
        />
        <SidebarItems
          addProps={itemsProp}
          icon={<Youtubeicon props={"font-bold"} size={"md"} />}
          title={"Youtube Links"}
        />
        <SidebarItems
          addProps={itemsProp}
          icon={<Documenticon props={"font-bold"} size={"md"} />}
          title={"Documents "}
        />
      </div>

      <div className="absolute bottom-10">
        <Button
          variant="primary"
          text="Logout"
          startIcon={<Exiticon size="lg" />}
          onClick={logoutUser}
        />
      </div>
    </div>
  );
};

const itemsProp: String =
  "text-grey-700 cursor-pointer p-2 transition duration-150 hover:bg-gray-200 rounded w-full";
export default Sidebar;
