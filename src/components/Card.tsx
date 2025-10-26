import type { ReactElement } from "react";
import { Deleteicon } from "../icons/Deleteicon";
import { Shareicon } from "../icons/Shareicon";
import { Twittericon } from "../icons/Twittericon";
import Youtubeicon from "../icons/Youtubeicon";
import { Documenticon } from "../icons/Documenticon";
import { Editicon } from "../icons/Editicon";
import { Button } from "./ui/Button";
import YoutubeComponent from "./ui/cardComponent/YoutubeComponent";
import TwitterComponent from "./ui/cardComponent/TwitterComponent";

import TagElement from "./ui/cardComponent/TagElement";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../utils/Redux/Store";
import axios from "axios";
import {
  setLoading,
  setRefreshContent,
} from "../utils/Redux/Slices/contentSlice";
interface CardProps {
  title: string;
  link: string;
  type: "twitter" | "youtube" | "document";
  onClick?: () => void;
  OnClickDelete?: () => void;
  _id: number | string;
  tags: [{ name: string; _id: string }];
  disableDelete?:boolean;
}

type IconElement = Record<CardProps["type"], ReactElement>;
const IconsIdentifier: IconElement = {
  twitter: <Twittericon size="md" />,
  youtube: <Youtubeicon size="md" />,
  document: <Documenticon size="md" />,
};
const cardClass: string = "my-1  self-center";
export const Card = ({ title, link, type, _id, tags ,disableDelete=false }: CardProps) => {
  const { token } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  async function deleteCard() {
    try {
      // console.log(_id);
      dispatch(setLoading(true));
      const response = await axios.delete(`/api/v1/content/${_id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log(response);
      if (response.status === 204) {
        toast.success("Content Removed");
        dispatch(setRefreshContent());
      }
    } catch (error) {
      console.error(error);
      toast.error("Deletion failed");
    } finally {
      dispatch(setLoading(false));
    }
  }

  return (
    <div className="h-90 w-80 lg:w-88 relative" key={_id}>
      <div
        className="p-4 w-full h-full bg-off-white rounded-md 
       border-grey-200 border flex flex-col justify-between
      group relative"
      >
        <div className="h-full flex flex-col">
          {/* Header section */}
          <div className=" flex justify-between mb-2">
            <div className=" flex gap-1 items-center text-xl">
              <span className="text-grey-600 pr-2">
                {IconsIdentifier[type]}
              </span>
              <span>{title}</span>
            </div>
            <div className="flex items-center text-xl">
              <div className="pr-2 text-grey-600 ">
                <a href={link} target="_blank" rel="noopener noreferrer">
                  <Shareicon size="md" />
                </a>
              </div>
             {!disableDelete && <div className="pr-2 text-grey-600 " onClick={deleteCard}>
                <Deleteicon size="md" />
              </div>}
            </div>
          </div>
          {/* content section */}
          <div className="overflow-y-auto overflow-x-clip h-full rounded ">
            {type == "youtube" && (
              <YoutubeComponent cardClass={cardClass} link={link} />
            )}
            {type === "twitter" && (
              <TwitterComponent cardClass={cardClass} link={link} />
            )}
            {type === "document" && (
              <div className={`${cardClass}`}>
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Fuga
                ipsam tempora laudantium eligendi, quisquam reiciendis sapiente
                veniam voluptatem. Sed voluptatibus deserunt consectetur sunt
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Fuga
                ipsam tempora laudantium eligendi, quisquam reiciendis sapiente
                veniam voluptatem. Sed voluptatibus deserunt consectetur sunt
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Fuga
                ipsam tempora laudantium eligendi, quisquam reiciendis sapiente
                veniam voluptatem. Sed voluptatibus deserunt consectetur sunt
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Fuga
                ipsam tempora laudantium eligendi, quisquam reiciendis sapiente
                veniam voluptatem. Sed voluptatibus deserunt consectetur sunt
              </div>
            )}
          </div>
          {/* tags */}
          <div className="flex flex-wrap gap-1 pt-4">
            {tags.length > 1 &&
              tags.map(
                (tag, index) =>
                  index > 0 && <TagElement key={index} text={tag.name} />
              )}
          </div>
        </div>
        {/* Edit button */}
        {/* <div className={slideup}>
          <Button
            variant="secondary"
            text="edit"
            startIcon={<Editicon size="md" />}
          />
        </div> */}
      </div>
    </div>
  );
};
const slideup: string = `absolute -bottom-16 left-0 w-full flex justify-center
    transition-all duration-300 ease-in-out
    transform group-hover:-translate-y-20
    opacity-0 group-hover:opacity-100
   
>`;
const text: string = `
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Fuga
              ipsam tempora laudantium eligendi, quisquam reiciendis sapiente
              veniam voluptatem. Sed voluptatibus deserunt consectetur sunt
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Fuga
              ipsam tempora laudantium eligendi, quisquam reiciendis sapiente
              veniam voluptatem. Sed voluptatibus deserunt consectetur sunt
               Lorem ipsum dolor sit amet consectetur adipisicing elit. Fuga
              ipsam tempora laudantium eligendi, quisquam reiciendis sapiente
              veniam voluptatem. Sed voluptatibus deserunt consectetur sunt
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Fuga
              ipsam tempora laudantium eligendi, quisquam reiciendis sapiente
              veniam voluptatem. Sed voluptatibus deserunt consectetur sunt`;
