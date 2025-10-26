import { Button } from "./ui/Button";
import { Shareicon } from "../icons/Shareicon";
import { Plusicon } from "../icons/Plusicon";

interface ModalType {
  setAddContent: React.Dispatch<React.SetStateAction<boolean>>;
  setShareContent:React.Dispatch<React.SetStateAction<boolean>>;
}

const Header = ({setAddContent,setShareContent}:ModalType) => {
  return (
    <div className="w-full  flex p-4 justify-end gap-4 
     bg-off-white border-b-2 border-slate-200 ">
      <Button
        text="Share Brain"
        variant="primary"
        startIcon={<Shareicon size="lg" />}
        onClick={()=>setShareContent(true)}
      />
      <Button
        text="Add Content"
        variant="secondary"
        startIcon={<Plusicon size="lg"/>}
        onClick={()=>setAddContent(true)}
      />
    </div>
  );
};

export default Header;
