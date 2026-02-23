import React, { Fragment, useEffect, useState } from "react";
import axios from "axios";

const ListPapers = () => {
  const [papers, setPapers] = useState([]);

  //delete paper function

  const deletePaper = async id => {
    try {
      await axios.delete(`http://localhost:5000/papers/${id}`);
      setPapers(papers.filter(paper => paper.paper_id !== id));
    } catch (err) {
      console.error(err.message);
    }
  };

  const getPapers = async () => {
    try {
      const response = await axios.get("http://localhost:5000/papers");
      setPapers(response.data);
    } catch (err) {
      console.error(err.message);
      setPapers([]);
    }
  };

  useEffect(() => {
    getPapers();
  }, []);

  console.log(papers);

  return (
    <Fragment>
      {" "}
      <table className="table mt-5 text-center">
        <thead>
          <tr>
            <th>Author</th>
            <th>Description</th>
            <th>Edit</th>
            <th>Delete</th>
            <th>View</th>
          </tr>
        </thead>
        <tbody>
          {/*<tr>
            <td>John</td>
            <td>Doe</td>
            <td>john@example.com</td>
          </tr> */}
          {papers.map(paper => (
            <tr key={paper.paper_id}>
              <td>{paper.author}</td>
              <td>{paper.description}
              </td>
              <td>
                <button
                  className="btn btn-danger"
                  onClick={() => deletePaper(paper.paper_id)}
                >
                  Delete
                </button>
              </td>
              <td>
                <button
                 className="btn btn-danger"
                 >
                    Veiw
                 </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Fragment>
  );
};

export default ListPapers;