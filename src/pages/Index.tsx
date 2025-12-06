import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.log("Index component mounted, current path:", location.pathname);
    navigate("/login", { replace: true });
  }, [navigate, location]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-foreground">Chargement...</div>
    </div>
  );
};

export default Index;
