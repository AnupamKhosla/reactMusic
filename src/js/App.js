// Authored by Anupam khosla under license CC BY-SA 4.0

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
      loading: true, //this is changed to trigger re render after fetch loading is complete
      error: false,   // in case fetch gives 404 etc, change this to trigger re render with error msg        
    };    
    this.searchString = "australia"; //default value of search input
    this.filterString = "bycountry"; //default value of toggle buttons
    this.offset = 0 // for pagination, change by 12 every page, same as limit
    this.channels = [];
    // api_key = "AIzaSyAuW0tVBPyQQFkpXaB_2G7pcwViIB22DRg"; // old Youtube API
    this.radio_query = "https://de1.api.radio-browser.info/json/stations/";
    //fetch with cors
    fetch(this.radio_query + this.filterString + "/" + this.searchString + "?limit=12" + "&offset=" + this.offset)
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
    this.onPageChange = this.onPageChange.bind(this);
    console.log("app constructor");
  }
  onTriggerSearch(value) { //use this when search results need to update on re render
    let fallbackString = (this.filterString == "bycountry" ? "australia" : "90.7");
    let valueLowerCase = value.toLowerCase() || fallbackString; //if empty use fallback
    if(!this.state.loading && (this.searchString != valueLowerCase) ) {  // no change in state untill prev fetch is complete or search string is same
      this.searchString = valueLowerCase; 
      this.channels = [];
      this.setState( 
        (prevState, props) => ({
          loading: true
        })
      ); //this will trigger re render, it will remove the existing cards.
      
      fetch(this.radio_query + this.filterString + "/" + valueLowerCase + "?limit=12" + "&offset=" + this.offset)
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
    }
    else {
      this.filterString = "byname";
    }
    //get search string value and trim whitespace
    let value = document.querySelector("#search").value.trim();
    this.searchString = value + "makeDifferentFromValue"; //makes react think that new search string is given on every toggle
    this.onTriggerSearch(value); // value !== searchString
  }
  onPageChange(e) {
    //if e.target is an anchor tag and e.target.classList.value has string pagination
    if(e.target.tagName == "A" && e.target.classList.value.includes("pagination") && !e.target.classList.value.includes("is-current")) {
      let value = this.searchString; //Use old searchstring, because user hasn't fetched new search results yet.
      this.searchString = value + "makeDifferentFromValue"; //makes react think that new search string so that fetch condition is met 
      let page = e.target.textContent;
      this.offset = parseInt(page);
      this.onTriggerSearch(value); // value !== searchString
    }
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
          {this.state.error ? <div className="error-msg"> <h2>Error Occured</h2> </div> : <Cards channels={this.channels} loading={this.state.loading} onPageChange={this.onPageChange} />}
          {/* In future find a way to NOT UPDATE/RE_RENDER Cards when this.stateloading changes */}          
        </div> 
      </>
    )
  };
}

//export app2 without default
export {App as App3};




