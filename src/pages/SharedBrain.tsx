import axios from "axios";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "../components/Card";

export type Tag = {
  name: "twitter" | "youtube" | "document" | string;
  _id: string | number;
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
      const response = await axios.get(`/api/v1/brain/${hash}`, {
        headers: { "Content-Type": "application/json" },
      });

      if (response.data.statusCode === 200) {
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
    <div
      className="min-h-screen w-full overflow-x-hidden 
                 bg-[url('/share_brain1.svg')] bg-cover bg-center bg-no-repeat flex flex-col"
    >
      {/* Fixed header */}
      {contentData.length > 0 && (
        <header
          className="w-full py-4 text-center text-4xl font-semibold
                   text-gray-100 backdrop-blur-xl bg-white/20 shadow-md fixed top-0 z-50"
        >
          Shared Brain
        </header>
      )}

      {/* Main content */}
      <main
        className="flex flex-wrap gap-6 justify-center items-start 
                   pt-28 pb-12 px-4 w-full overflow-x-hidden"
      >
        {contentData.length > 0 ? (
          contentData.map((data, index) => {
            const { title, link, tags } = data;
            return (
              <Card
                key={index}
                tags={tags}
                type={tags[0].name}
                title={title}
                link={link}
                _id={index}
                disableDelete={true}
              />
            );
          })
        ) : (
          <div className="flex items-center justify-center h-[60vh] w-full">
            <h1
              className="text-6xl text-center font-semibold italic text-red-700 cursor-pointer"
              onClick={() => navigate("/login")}
            >
              No Smoking{" "}
            </h1>
          </div>
        )}
      </main>
    </div>
  );
};

export default SharedBrain;
