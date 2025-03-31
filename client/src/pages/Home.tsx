import React, { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import MainContent from "@/components/MainContent";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Home() {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  // Update sidebar state when screen size changes
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen">
      <Sidebar 
        isMobile={isMobile} 
        isOpen={sidebarOpen} 
        onToggle={toggleSidebar} 
      />
      <MainContent onToggleSidebar={toggleSidebar} />
    </div>
  );
}
