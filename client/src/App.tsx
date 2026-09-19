import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import { ThemeProvider } from "./contexts/ThemeContext";

import { Layout } from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import UploadData from "@/pages/UploadData";
import Analytics from "@/pages/Analytics";
import ManagerApproval from "@/pages/ManagerApproval";
import BlockchainLog from "@/pages/BlockchainLog";
import FestivalForecast from "@/pages/FestivalForecast";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/upload" component={UploadData} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/festivals" component={FestivalForecast} />
      <Route path="/approval" component={ManagerApproval} />
      <Route path="/blockchain" component={BlockchainLog} />
      <Route>404: No such page!</Route>
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <TooltipProvider>
        <Toaster />
        <Layout>
          <Router />
        </Layout>
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
