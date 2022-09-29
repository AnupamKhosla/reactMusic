import logo from '../images/musical-note.png';
import 'bulma/css/bulma.css';
import '../css/App.css';
import React from 'react';
import { useEffect, useState } from "react";
//import header
import Header from './Header';

function App() {
  var api_key = "AIzaSyAuW0tVBPyQQFkpXaB_2G7pcwViIB22DRg";
  
  //set state as empty
  const [videos, setVideos] = useState([]);
  console.log(videos);
  //log state
  useEffect(() => {
    console.log(videos);
  }, [videos]);


  

  useEffect(() => {
    //fetch data
    fetch('https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=25&q=react&type=video&key=' + api_key)
      .then(response => response.json())
      .then(data => {
        //set state
        setVideos(data.items);
        console.log(data.items)
      })
  }, []);
  return (
    <div className="App">
      <div className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Anupam Khosla's project to use youtube api. Below is a random youtube video list generated.
        </p>
        
        <ul>
          {videos.map(video => (
            <li key={video.id.videoId}>
              <a href={`https://www.youtube.com/watch?v=${video.id.videoId}`}>
                {video.snippet.title}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

class App2 extends React.Component {

  constructor(props) {
    super(props);    
    this.state = {
      videos: []
    };        
  }

  api_key = "AIzaSyAuW0tVBPyQQFkpXaB_2G7pcwViIB22DRg";

  componentDidMount() {
      fetch('https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=25&q=react&type=video&key=' + this.api_key)
        .then(response => response.json())
        .then(data => {
          //set state
          this.setState({videos: data.items || []});
      });
    }
  
  render() {
    return (
      <>
        <Header />
        
        <div className="main"> 
          Copyright by ANupam Khosla 2022     
          <ul>
            {this.state.videos.map(video => (
              <li key={video.id.videoId}>
                <a href={`https://www.youtube.com/watch?v=${video.id.videoId}`}>
                  {video.snippet.title}
                </a>
              </li>
            ))}
          </ul>
        </div> 
      </>
    )
  };
}



//export app2 without default
export {App2 as App3};

export default App;



