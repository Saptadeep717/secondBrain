import type { ReactElement } from "react";

interface itemsprop {
  icon: ReactElement;
  title: String;
  addProps: String;
  onClick?: () => void;
}
export const SidebarItems = ({ icon, title, addProps, onClick }: itemsprop) => {
  return (
    <div
      className={`${addProps} flex items-center gap-4 text-xl`}
      onClick={onClick}
    >
      <span>{icon}</span>
      <span className="capitalize">{title}</span>
    </div>
  );
};

export default SidebarItems;
