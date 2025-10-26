import { useState } from "react";
import CardsHolder from "./CardsHolder";
import Header from "./Header";
import InputModal from "./modal/InputModal";
import ShareBrainModal from "./modal/ShareBrainModal";

const Hero = () => {
  const [addContent, setAddContent] = useState(false);
  const [shareContent, setShareContent] = useState(false);

  return (
    
    <div>
      <InputModal open={addContent} onClose={() => setAddContent(false)} />
      <ShareBrainModal open={shareContent} onClose={()=>setShareContent(false)}/>
      <Header setShareContent={setShareContent} setAddContent={setAddContent} />
      
      <div>
        <CardsHolder />
      </div>
    </div>
  );
};

export default Hero;
