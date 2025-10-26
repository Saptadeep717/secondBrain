import { useRef, useState } from "react";
import { Crossicon } from "../../icons/Crossicon";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Plusicon } from "../../icons/Plusicon";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import {
  setLoading,
  setRefreshContent,
} from "../../utils/Redux/Slices/contentSlice";
import axios from "axios";
import type { RootState } from "../../utils/Redux/Store";
interface ModalType {
  open: boolean;
  onClose: () => void;
}

export const contentType = {
  Youtube: "youtube",
  Twitter: "twitter",
  Document: "document",
};

type PrimaryType = (typeof contentType)[keyof typeof contentType];

const InputModal = ({ open, onClose }: ModalType) => {
  const titleRef = useRef<HTMLInputElement>(null);
  const linkRef = useRef<HTMLInputElement>(null);
  const tagsRef = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<PrimaryType>(contentType.Youtube);
  const [customTags, setCustomTags] = useState<string[]>([]);

  const { token } = useSelector((state: RootState) => state.auth);
  const { refreshContent } = useSelector((state: RootState) => state.content);
  const dispatch = useDispatch();

  const addCustomTags = () => {
    const tag = tagsRef.current?.value?.trim() ?? "";

    if (!tag) return; // Prevent empty tags
    if (customTags.length >= 6)
      return toast.error("You can add up to 6 tags only!");
    if (customTags.includes(tag)) return toast.error("Tag already added!");

    setCustomTags((prev) => [...prev, tag]);
    tagsRef.current!.value = ""; // Clear input
  };

  function setDefault() {
    titleRef.current!.value = "";
    tagsRef.current!.value = "";
    linkRef.current!.value = "";
    setCustomTags([]);
  }

  const removeTag = (index: number) => {
    setCustomTags((prev) => prev.filter((_, i) => i !== index));
  };

  async function addContent() {
    try {
      dispatch(setLoading(true));

      const title: string = titleRef.current?.value?.toString() ?? "";
      const link: string = linkRef.current?.value?.toString() ?? "";
      const tags: string[] = [type, ...customTags];

      if (!title.length) {
        toast.error("Enter title");
        return;
      }
      if (!link.length) {
        toast.error("Enter link");
        return;
      }
      if (!tags.length) {
        toast.error("Enter tags");
        return;
      }
      //console.log(title, link, tags);

      const response = await axios.post(
        `/api/v1/content`,
        { title, link, tags },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data?.statusCode === 201) {
        console.log(response.data);
        toast.success("Content added");
        dispatch(setRefreshContent());
      }
    } catch (error) {
      toast.error("Cannot add content");
      console.error(error);
    } finally {
      setDefault();
      dispatch(setLoading(false));
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      onClick={onClose}
    >
      {/* Background overlay */}
      <div className="absolute inset-0 bg-slate-500/60" />

      {/* Modal container */}
      <div
        className="relative bg-off-white rounded-2xl shadow-xl w-[25rem] p-6 z-50 flex flex-col items-start"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        >
          <Crossicon size="md" />
        </button>

        {/* Input fields */}
        <div className="flex flex-col gap-3 mt-2 w-full">
          <Input reference={titleRef} placeholder="Title" props="w-full" />
          <Input reference={linkRef} placeholder="Link" props="w-full" />
        </div>

        {/* Type selector */}
        <div className="mt-5 w-full flex flex-col items-start">
          <h1 className="text-gray-700 mb-2 font-medium">Select type</h1>
          <div className="flex gap-2 mb-3">
            <Button
              text="Youtube"
              variant={type === contentType.Youtube ? "primary" : "secondary"}
              onClick={() => setType(contentType.Youtube)}
            />
            <Button
              text="Twitter"
              variant={type === contentType.Twitter ? "primary" : "secondary"}
              onClick={() => setType(contentType.Twitter)}
            />
            <Button
              text="Document"
              variant={type === contentType.Document ? "primary" : "secondary"}
              onClick={() => setType(contentType.Document)}
            />
          </div>

          {/* Custom tags input */}
          <div className="flex flex-col items-start mt-4 w-full">
            <div
              className="flex items-center w-full"
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomTags();
                }
              }}
            >
              <Input
                placeholder="Custom Tags"
                reference={tagsRef}
                props=" w-80 pr-10"
              />
              <div
                className="absolute right-12 cursor-pointer bg-none h-10 rounded flex"
                onClick={addCustomTags}
              >
                <Plusicon size="md" props={" w-10 self-center"} />
              </div>
            </div>
          </div>

          {/* Tags display */}
          <div className="mt-3 flex flex-wrap gap-2 w-full">
            {customTags.map((customTag, index) => (
              <div key={index} className="flex items-center gap-1 py-1 ">
                <Button
                  text={`${customTag}`}
                  variant="secondary"
                  startIcon={<Crossicon size="md" />}
                  onClick={() => removeTag(index)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Submit button */}
        <div className="mt-6 w-full flex justify-center">
          <Button variant="primary" text="Add" onClick={addContent} />
        </div>
      </div>
    </div>
  );
};

export default InputModal;
