import { Button } from "./ui/Button";
import { Shareicon } from "../icons/Shareicon";
import { Plusicon } from "../icons/Plusicon";
import { getScreenWidth } from "../utils/hooks/getwidth";
import { Hambergericon } from "../icons/Hambergericon";

interface ModalType {
  setAddContent: React.Dispatch<React.SetStateAction<boolean>>;
  setShareContent: React.Dispatch<React.SetStateAction<boolean>>;
  setViewSidebar:React.Dispatch<React.SetStateAction<boolean>>;
}

const Header = ({ setAddContent, setShareContent ,setViewSidebar }: ModalType) => {
  const width = getScreenWidth();
  return (
    <div
      className={`w-full flex flex-reverse p-4  gap-4 
     bg-off-white border-b-2 border-slate-200 
     ${width <768 ?"justify-between" :"justify-end"}`}
    >
      {width < 768 && (
        <Button
          text=""
          variant="secondary"
          startIcon={<Hambergericon size="lg" />}
          onClick={()=>setViewSidebar((prev)=>!prev)}
        />
      )}
      <div className="flex gap-2">
        <Button
          text={`${width < 768 ? "" : "Share Brain"}`}
          variant="primary"
          startIcon={<Shareicon size="lg" />}
          onClick={() => setShareContent(true)}
        />
        <Button
          text={`${width < 768 ? "" : "Add Content"}`}
          variant="secondary"
          startIcon={<Plusicon size="lg" />}
          onClick={() => setAddContent(true)}
        />
      </div>
    </div>
  );
};

export default Header;
