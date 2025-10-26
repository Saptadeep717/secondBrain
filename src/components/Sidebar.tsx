import { useDispatch, useSelector } from "react-redux";
import { Brainicon } from "../icons/Brainicon";
import { Exiticon } from "../icons/Exiticon";
import { Twittericon } from "../icons/Twittericon";
import Youtubeicon from "../icons/Youtubeicon";
import { setLoading, setToken } from "../utils/Redux/Slices/userSlice";
import SidebarItems from "./SidebarItems";
import { Button } from "./ui/Button";
import toast from "react-hot-toast";
import { Documenticon } from "../icons/Documenticon";
import { type ReactElement } from "react";
import type { RootState } from "../utils/Redux/Store";
import { setTagFilter } from "../utils/Redux/Slices/contentSlice";

type tagType = "youtube" | "twitter" | "document";

interface sidebarItemType {
  icon: ReactElement;
  title: tagType;
}

const SidebarItemsValue: sidebarItemType[] = [
  {
    icon: <Youtubeicon props={"font-bold"} size={"md"} />,
    title: "youtube",
  },
  {
    icon: <Twittericon props={"font-bold"} size={"md"} />,
    title: "twitter",
  },
  {
    icon: <Documenticon props={"font-bold"} size={"md"} />,
    title: "document",
  },
];
interface SidebarProps {
  viewSidebar: boolean; 
}
const Sidebar = ({viewSidebar}:SidebarProps) => {
  const dispatch = useDispatch();
  const { tagFilter } = useSelector((state: RootState) => state.content);
  function logoutUser() {
    try {
      dispatch(setLoading(true));
      dispatch(setToken(null));
      toast.success("Logout Successful");
    } catch (error) {
      toast.error("Logout Failed");
    } finally {
      dispatch(setLoading(false));
    }
  }
  function applyTagFilter(title: tagType) {
    try {
      if (tagFilter === title) {
        dispatch(setTagFilter("")); // remove filter if same tag clicked
        toast.success(`Removed ${title} filter`);
      } else {
        dispatch(setTagFilter(title)); // apply new filter
        toast.success(`Applied ${title} filter`);
      }
    } catch (error) {
      toast.error("filter failed");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div
      className={`
        fixed top-0 left-0 h-screen bg-off-white border-r-2 border-slate-200
        flex flex-col items-center transition-all duration-300 ease-in-out
        ${viewSidebar ? "translate-x-0" : "-translate-x-70"}
        lg:translate-x-0 lg:w-72 md:w-60 z-50 
      `}
    >
      <div className="header w-full p-4 hover:bg-slate-100 transition duration-150 hover:ease-in">
        <span className="flex items-center gap-2 font-semibold text-2xl">
          <span>
            <Brainicon size="2xl" props={`text-purple-800`} />
          </span>
          <span className="select-none">Second Brain</span>
        </span>
      </div>
      <div className="bullets mt-4 w-full flex-col items-center gap-4">
        {SidebarItemsValue &&
          SidebarItemsValue.map(({ icon, title }: sidebarItemType) => {
            return (
              <SidebarItems
                addProps={`${
                  tagFilter == title
                    ? "bg-purple-500 text-grey-100"
                    : "hover:bg-purple-100 text-grey-700"
                } cursor-pointer py-2 px-6 transition duration-150 w-full`}
                icon={icon}
                title={title}
                onClick={() => applyTagFilter(title)}
              />
            );
          })}
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

export default Sidebar;
