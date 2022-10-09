import React, { useEffect, useState } from "react";

import "../css/font.css";
import 'bulma/css/bulma.css';
import '../css/App.css';

import Header from './Header';
import Search from './Search';
import Cards from './Cards';

import logo from '../images/musical-note.png';


class App extends React.Component {
  constructor(props) {
    super(props);        
    this.state = {
      searchString: "australia" ,
      loading: true     
    };    
    this.channels = [];
    // api_key = "AIzaSyAuW0tVBPyQQFkpXaB_2G7pcwViIB22DRg"; // old Youtube API
    this.deezer_query = "https://de1.api.radio-browser.info/json/stations/bycountry/";
    //fetch with cors
    fetch(this.deezer_query + this.state.searchString + "?limit=30")
      .then(response => response.json())
      .then(data => {        
        this.channels = data || [];
        this.setState({
          loading: false,
          searchString: "australia"
        });
      });   
    //set state if current state is different from previous state    
    this.onChangeState = this.onChangeState.bind(this);
    this.onImgError = this.onImgError.bind(this);
    this.onToggle = this.onToggle.bind(this);
    console.log("app constructor");
  }
  onChangeState(value) {
    let valueLowerCase = value.toLowerCase() || "australia"; //defualt us always Australia    
    if(!this.state.loading && (valueLowerCase != this.state.searchString.toLowerCase())) {  // no change in state untill prev fetch is complete   
      this.channels = [];
      this.setState({
          loading: true               
      }); 

      fetch(this.deezer_query + valueLowerCase + "?limit=30")
        .then(response => response.json())
        .then(data => {          
          this.channels = data || [];          
          this.setState({
            loading: false,
            searchString: valueLowerCase
          });          
        });         
    }       
  }
  onImgError(e) {        
    console.log(this.onImgError);
    e.target.removeEventListener("onerror", this.onImgError);
    console.log(e.target.onerror, e.target.onError);
    //e.target.src = "http://www.noexist/fg.png";
    var fallback = "data:image/gif;base64,R0lGODlhAQABAIAAAMLCwgAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==";
    if(e.target.src != fallback) {
      e.target.src = fallback;
    }    
  }
  onToggle(e){

  }
  
  render() {
    console.log("app render"); 
    return (
      <>
        <Header />
        
        <div className="main container section"> 
          <h1 className="has-text-centered headline">
            FM Radio of the World
          </h1>          
          <Search channels={this.channels} onChangeText={this.onChangeState} loading={this.state.loading} onClickToggleState={this.onToggle}/>
          <Cards channels={this.channels}/>
          {/* In future find a way to NOT UPDATE/RE_RENDER Cards when this.stateloading changes */}          
        </div> 
      </>
    )
  };
}

//export app2 without default
export {App as App3};




