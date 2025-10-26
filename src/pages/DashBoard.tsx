import Sidebar from "../components/Sidebar";
import CardsHolder from "../components/CardsHolder";
import Header from "../components/Header";
import InputModal from "../components/modal/InputModal";
import ShareBrainModal from "../components/modal/ShareBrainModal";
import { useState } from "react";
function DashBoard() {
  const [addContent, setAddContent] = useState<boolean>(false);
  const [shareContent, setShareContent] = useState<boolean>(false);
  const [viewSidebar, setViewSidebar] = useState<boolean>(false);

  return (
    <div>
      {/* Sidebar component for navigation */}
      <Sidebar viewSidebar={viewSidebar} />{" "}
      {viewSidebar && (
        <div
          className="fixed inset-0 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setViewSidebar(false)}
        ></div>
      )}
      <div className="md:ml-60 lg:ml-72 min-h-screen">
        <InputModal open={addContent} onClose={() => setAddContent(false)} />
        <ShareBrainModal
          open={shareContent}
          onClose={() => setShareContent(false)}
        />
        <Header
          setViewSidebar={setViewSidebar}
          setShareContent={setShareContent}
          setAddContent={setAddContent}
        />

        <div>
          <CardsHolder />
        </div>
      </div>
    </div>
  );
}

export default DashBoard;
