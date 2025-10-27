import { useEffect } from "react";
import { Card } from "./Card";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import type { RootState } from "../utils/Redux/Store";
import { setContentData, setLoading } from "../utils/Redux/Slices/contentSlice";

const CardsHolder = () => {
  const dispatch = useDispatch();
  const { token } = useSelector((state: RootState) => state.auth);
  const { refreshContent, contentData, tagFilter } = useSelector(
    (state: RootState) => state.content
  );
  async function getContent() {
    try {
      dispatch(setLoading(true));
      const response = await axios.get(`/api/v1/content`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.data?.statusCode === 200) {
        console.log(response.data.message);

        dispatch(setContentData(response.data.data));
        console.log(contentData);
        // toast.success(response.data.message);
      }
    } catch (error) {
      console.error(error);
    } finally {
      dispatch(setLoading(false));
    }
  }
  useEffect(() => {
    getContent();
  }, [refreshContent]);
  return (
    <div className="py-8 px-8 relative flex flex-wrap gap-4 justify-start items-center">
      {contentData.length > 0 &&
        contentData.map((data) => {
          const { title, link, tags, _id } = data;
          // console.log(link,tags[0].name);
          if (tagFilter?.length > 0) {
            if (tagFilter !== tags[0].name) return;
          }
          return (
            <Card
              tags={tags}
              type={tags[0].name}
              title={title}
              link={link}
              _id={_id}
            />
          );
        })}
      {contentData.length == 0 && <div className="text-7xl absolute left-80 top-60">Add your thoughts</div>}

      {/* <div className="bg-grey-100  w-screen h-12"></div> */}
    </div>
  );
};

export default CardsHolder;
