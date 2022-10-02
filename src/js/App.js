import React, { useEffect, useState } from "react";
//import { React } from "react";

import 'bulma/css/bulma.css';
import '../css/App.css';

import Header from './Header';
import Search from './Search';

import logo from '../images/musical-note.png';




class App extends React.Component {

  constructor(props) {
    super(props);        
    this.state = {
      searchString: "australia"      
    };    
    this.channels = [];
    // api_key = "AIzaSyAuW0tVBPyQQFkpXaB_2G7pcwViIB22DRg"; // old Youtube API
    this.deezer_query = "https://all.api.radio-browser.info/json/stations/bylanguage/";
    //fetch with cors
    fetch(this.deezer_query + this.state.searchString)
      .then(response => response.json())
      .then(data => {
        //set state
        //console.log(data[0]);
        this.channels = data || [];
        this.setState({searchString: "australia"});
      });   
    
    this.onChangeState = this.onChangeState.bind(this);
  }
  onChangeState(value) {
    let valueLowerCase = value.toLowerCase();
    console.log(value);
    fetch(this.deezer_query + valueLowerCase)
      .then(response => response.json())
      .then(data => {
        //set state
        //console.log(data[0]);
        this.channels = data || [];
        this.setState({searchString: valueLowerCase});
      });       
  }
  

  componentDidMount() {
    console.log("mounted");     
  }
  
  render() {
    return (
      <>
        <Header />
        
        <div className="main container"> 
          <h1>
            International radio app by <a href="#">Anupam Khosla</a>     
          </h1>
          <hr/>
          <h2>Search for radio channels by country</h2>
          <Search channels={this.channels} onChangeText={this.onChangeState}/>
          <div className="cards columns is-multiline">
            {
              this.channels.map(
              (channel, index) => 
                  {
                    var breakClass = "";
                    if(index % 3 == 0) {
                      breakClass = "test"
                    }
                    return ( 
                      <div className={breakClass + " column is-one-third"} key={channel.changeuuid}>
                        <div className="card">
                          <div className="card-image">
                            <figure className="image is-4by3">
                              <img src={channel.favicon} alt="Placeholder image" />
                            </figure>
                          </div>
                          <div className="card-content">
                            <div className="media">
                              <div className="media-left">
                                <figure className="image is-48x48">
                                  <img src={channel.favicon} alt="Placeholder image" />
                                </figure>
                              </div>
                              <div className="media-content">
                                <p className="title is-4">{channel.name}</p>
                                <p className="subtitle is-6">
                                  <a href={channel.homepage}>
                                    Link
                                  </a>
                                </p>
                              </div>
                            </div>
                            <div className="content">
                              <pre>{JSON.stringify(channel)}</pre>
                              <br />                    
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  }
                
              )
            }
          </div>
        </div> 
      </>
    )
  };
}



//export app2 without default
export {App as App3};




