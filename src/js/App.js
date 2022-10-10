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
      loading: true,
      error: false     
    };    
    this.searchString = "australia";
    this.filterString = "bycountry"; 
    this.channels = [];
    // api_key = "AIzaSyAuW0tVBPyQQFkpXaB_2G7pcwViIB22DRg"; // old Youtube API
    this.deezer_query = "https://de1.api.radio-browser.info/json/stations/";
    //fetch with cors
    fetch(this.deezer_query + this.filterString + "/" + this.searchString + "?limit=2")
      .then(response => {
        if (response.ok) {
          return response.json();
        }
        this.setState({
          error: true,
          loading: false
        });
        throw new Error('Something went wrong');  
      })
      .then(data => {        
        this.channels = data || [];
        this.setState( 
          (prevState, props) => ({
            loading: false
          })
        );
      });   
      
    this.onTriggerSearch = this.onTriggerSearch.bind(this);
    this.onToggle = this.onToggle.bind(this);
    console.log("app constructor");
  }
  onTriggerSearch(value) {
    let fallbackString = (this.filterString == "bycountry" ? "australia" : "90.7");
    let valueLowerCase = value.toLowerCase() || fallbackString; //if empty use fallback
    if(!this.state.loading) {  // no change in state untill prev fetch is complete   
      this.channels = [];
      this.setState( 
        (prevState, props) => ({
          loading: true
        })
      ); //this will trigger re render, it will remove the existing cards.
      
      fetch(this.deezer_query + this.filterString + "/" + valueLowerCase + "?limit=2")
        .then(response => {
          if (response.ok) {
            return response.json();
          }
          //set state error true and loading false          
          this.setState({
            loading: false,
            error: true
          });
          throw new Error('Something went wrong');  
        })
        .then(data => {          
          this.channels = data || [];  
          this.setState(
            (prevState, props) => ({
              loading: false
            })
          );
        });          
    }         
  }       
  onToggle(e){
    //if first button has class active, then change filterString state
    if(e.target.classList.contains("left")) {
      this.filterString = "bycountry";
      console.log("bycountry");
    }
    else {
      this.filterString = "byname";
      console.log("byname");
    }
    //get search string value and trim whitespace
    let value = document.querySelector("#search").value.trim();
    this.onTriggerSearch(value);
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
          <Search channels={this.channels} onChangeText={this.onTriggerSearch} loading={this.state.loading} onClickToggleState={this.onToggle}/>
          {this.state.error ? <div className="error-msg"> <h2>Error Occured</h2> </div> : <Cards channels={this.channels} loading={this.state.loading} />}
          {/* In future find a way to NOT UPDATE/RE_RENDER Cards when this.stateloading changes */}          
        </div> 
      </>
    )
  };
}

//export app2 without default
export {App as App3};




