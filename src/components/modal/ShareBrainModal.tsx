import { useDispatch, useSelector } from "react-redux";
import { Button } from "../ui/Button";
import type { RootState } from "../../utils/Redux/Store";
import axios from "axios";
import toast from "react-hot-toast";
import {
  setInvertShare,
  setLinkData,
} from "../../utils/Redux/Slices/copylinkSlice";
import { setLoading } from "../../utils/Redux/Slices/userSlice";

interface ModalType {
  open: Boolean;
  onClose: () => void;
}

const buttonText = {
  0: "Create Link",
  1: "Remove Link",
};

const ShareBrainModal = ({ open, onClose }: ModalType) => {
  if (!open) return null;
  const { token } = useSelector((state: RootState) => state.auth);
  const { share } = useSelector((state: RootState) => state.link_);

  const dispatch = useDispatch();

  async function copyToClipBoard(sharedLink: string) {
    try {
      await navigator.clipboard.writeText(`${sharedLink}`);
      toast.success("copied to clipboard");
    } catch (error) {
      console.error("Failed to copy!", error);
      toast.success("failed to copy");
    }
  }
  async function generateLink() {
    try {
      dispatch(setLoading(true));
      const response = await axios.post(
        `/api/v1/brain/share`,
        { share },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.statusCode === 200) {
        console.log("Link generated:", response.data);

        const hash: string = response.data.data?.hash?.toString() || "";
        if (hash.length) {
          toast.success("Link Generated");
          const sharedLink = `${window.location.href.replace("/dashboard","")}/content/${hash}`;

          dispatch(setLinkData(sharedLink));

          share && copyToClipBoard(sharedLink);
        } else {
          toast.success("Link Removed");
          dispatch(setLinkData(""));
        }

        dispatch(setInvertShare());
      }
    } catch (err) {
      console.error("Error generating link:", err);
      toast.error("Error generating link");
    } finally {
      dispatch(setLoading(false));
    }
  }
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      onClick={onClose}
    >
      {/* Background overlay */}
      <div className="absolute inset-0 bg-slate-500/60" />

      {/* Modal */}
      <div className={` inset-0 z-50 flex items-center justify-center`}>
        <div className="bg-off-white rounded-lg border border-slate-200 flex flex-col p-10 items-center shadow-lg">
          <span className="text-center">
            {share
              ? "Do you want to share your brain"
              : " You have shared your brain with the world"}
          </span>
          <span className="italic text-sm mt-2 text-gray-500">
            {!share ? "Want to unshare ?" : "Link will be copied to clipboard"}
          </span>
          <div className="my-4">
            {share ? (
              <Button
                variant="primary"
                text={buttonText[0]}
                onClick={generateLink}
              />
            ) : (
              <Button
                variant="secondary"
                text={buttonText[1]}
                onClick={generateLink}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareBrainModal;
