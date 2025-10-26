import type { ReactElement } from "react";

interface itemsprop {
  icon: ReactElement;
  title: String;
  addProps:String;
}
export const SidebarItems = ({ icon, title,addProps}: itemsprop) => {
  return (
    <div className={`${addProps} flex items-center gap-4 text-xl`}>
      <span>{icon}</span>
      <span>{title}</span>
    </div>
  );
};

export default SidebarItems;
