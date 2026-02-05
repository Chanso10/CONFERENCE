import { Fragment } from "react";
import './App.css';
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import PaperList from "./components/PaperList";
import PaperView from "./components/PaperView";

// components
import InputTodo from "./components/InputTodo";
import ListTodos from "./components/ListTodos";
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<PaperList />} />
        <Route path="/todos/:id" element={<PaperView />} />
      </Routes>
    </Router>
  );
}

export default App;
