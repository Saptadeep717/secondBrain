import Hero from "../components/Hero";
import Sidebar from "../components/Sidebar";

function DashBoard() {
  return (
    <div>
      <Sidebar /> {/* Sidebar component for navigation */}
      <div className=" ml-72 min-h-screen bg-grey-100 ">
        <Hero />
      </div>
    </div>
  );
}

export default DashBoard;
