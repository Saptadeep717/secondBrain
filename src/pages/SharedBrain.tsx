import axios from "axios";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "../components/Card";

type Tag = {
  name: "twitter" | "youtube" | "document" | any;
  _id: string;
};

type DataItem = {
  title: string;
  link: string;
  tags: Tag[];
};

type DataType = DataItem[];

const SharedBrain = () => {
  const [contentData, setContentData] = useState<DataType>([]);
  const navigate = useNavigate();
  const { hash } = useParams();
  async function getSharedData() {
    try {
      console.log(hash);

      const response = await axios.get(`/api/v1/brain/${hash}`, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.data.statusCode === 200) {
        console.log(response.data);
        setContentData(response.data.data);
        toast.success(response.data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error("Broken Link");
    }
  }
  useEffect(() => {
    getSharedData();
  }, []);
  return (
    <div className="max-w-screen max-h-screen">
      {contentData.length > 0 && (
        <div className="flex flex-col bg-[url('/share_brain1.svg')] bg-center bg-cover bg-fixed">
          <div className="self-center w-full  ">
            <h1
              className="backdrop-blur-3xl py-4 text-center text-4xl w-full fixed z-50
           font-semibold
          "
            >
              Shared Brain
            </h1>
          </div>
          <div className="flex flex-wrap py-20 gap-4 items-center justify-center">
            {contentData.map((data, index) => {
              const { title, link, tags } = data;
              // console.log(link,tags[0].name);
              return (
                <Card
                  tags={tags}
                  type={tags[0].name}
                  title={title}
                  link={link}
                  id={index}
                />
              );
            })}{" "}
          </div>
        </div>
      )}
      {contentData.length == 0 && (
        <div className="bg-[url('/share_brain1.svg')] bg-center bg-cover flex items-center justify-center w-screen h-screen">
          <h1
            className="text-7xl font-semibold italic text-red-700 cursor-pointer"
            onClick={() => {
              navigate("/login");
            }}
          >
            Broken Link
          </h1>
        </div>
      )}
    </div>
  );
};

export default SharedBrain;
