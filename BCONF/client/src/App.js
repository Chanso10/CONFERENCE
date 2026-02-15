import { Fragment } from "react";
import './App.css';
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import PaperList from "./components/PaperList";
import PaperView from "./components/PaperView";
import ListPapers from "./components/ListPapers";
// components
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<PaperList />} />
        <Route path="/papers/:id" element={<PaperView />} />
      </Routes>
    </Router>
  );
}

export default App;
