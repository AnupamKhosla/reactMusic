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
    this.resetQuery();
    this.selectedServer = undefined;
    this.servers = [
                    {
                        "ip": "95.179.139.106",
                        "name": "nl1.api.radio-browser.info"
                    },
                    {
                        "ip": "89.58.16.19",
                        "name": "at1.api.radio-browser.info"
                    },
                    {
                        "ip": "188.68.62.16",
                        "name": "de1.api.radio-browser.info"
                    },
                    {
                        "ip": "2a03:4000:6:8077::1",
                        "name": "de1.api.radio-browser.info"
                    },
                    {
                        "ip": "2a0a:4cc0:0:db9:282b:91ff:fed0:ddea",
                        "name": "at1.api.radio-browser.info"
                    },
                    {
                        "ip": "2001:19f0:5001:32a4:5400:2ff:fe37:75c2",
                        "name": "nl1.api.radio-browser.info"
                    }
                ]    
    this.selectServer(0); //if nth server fails it will try n+1th server
    //also will call FreshSearch() on success

    this.onTriggerSearch = this.onTriggerSearch.bind(this);
    this.onToggle = this.onToggle.bind(this);
    this.onPageChange = this.onPageChange.bind(this);
    this.onTotalChannelChange = this.onTotalChannelChange.bind(this);    
  }
  resetQuery() {
    this.urlParams = new URLSearchParams(window.location.search);
    this.searchString = this.urlParams.get("search"); //default value of search input
    this.tmpSearchString = this.searchString || "australia";
    this.filterString = this.urlParams.get("filter") || "bycountry"; //default value of toggle buttons    
    if((this.filterString !== "bycountry") && (this.tmpSearchString == "")) {
      this.tmpSearchString = "90.7 fm"
    }    
    this.offset = ((this.urlParams.get("page")-1) > -1) ? ((this.urlParams.get("page")-1)*12) : 0 // for pagination, change by 12 every page, same as limit. page1 == offset0, page2==offset12
    this.channels = [];
    this.totalChannels = 0;
  }

  FreshSearch() { //execute brand new search based upon url params    
    
    // api_key = "AIzaSyAuW0tVBPyQQFkpXaB_2G7pcwViIB22DRg"; // old Youtube API
    this.radio_query = this.selectedServer + "/json/stations/"; 
    //IMPORTANT: In future check for multiple servers response and use the one that's active, one was down last time
    this.full_query = "https://" + this.radio_query + this.filterString + "/" + this.tmpSearchString;
    //fetch with cors
    console.log(this.full_query + "?limit=12" + "&offset=" + this.offset);
    fetch(this.full_query + "?limit=12" + "&offset=" + this.offset)
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
  }
  selectServer(index) {

     var res = fetch("https://" + this.servers[index].name + "/json/stats")
                .then(response => {                    
                    if (response.ok) {
                        this.selectedServer = this.servers[index].name;            
                        this.FreshSearch();
                        return 1;
                    }                          
                    else if((index+1) < this.servers.length) {
                        console.info("trying next server");
                        this.selectServer(index+1);
                    }
                    else {
                      this.setState({
                        error: true,
                        loading: false
                      });
                      throw new Error('All servers are down');
                    } 
                }, 
                error => {
                  if((index+1) < this.servers.length) {
                    console.info("trying next server");
                    this.selectServer(index+1);
                  }
                  else {
                    //set state error
                    this.setState({
                      error: true,
                      loading: false
                    });
                    throw new Error('All servers are down');
                  } 
                }
              );    
    
  }


  onTriggerSearch(value, event = undefined) { //when search icon is clicked or form is submitted with "enter"
    //use this when search results need to update on re render      
    if(!event.target.classList.value.includes("pagination")) { //not from pagination
    //for new searches, create new pagination and start from page 1
    //this line executes on toggle and form search click/enter
      this.offset = 0;
      this.totalChannels = 0; //this will update the state of pagination and cause re render with new empty ata
    }
    else { //this happens on pagination click        
      //set this.offset to data value of event.currentTarget
      this.offset = (event.currentTarget.dataset.page - 1) * 12; 
      //offset 12 means result starts from 13th     
    }
    let fallbackString = (this.filterString == "bycountry" ? "australia" : "90.7");
    let valueLowerCase = value.toLowerCase() || fallbackString; //if empty use fallback
    if(!this.state.loading && (this.searchString != valueLowerCase) ) {  // no change in state untill prev fetch is complete or search string is same
      if(!!value) { //if search field text is not empty
        this.searchString = valueLowerCase; 
      }
      else {
        this.searchString = "";
      }
      this.channels = [];
      this.setState( 
        (prevState, props) => ({
          loading: true
        })
      ); //this will trigger re render, it will remove the existing cards.
      this.full_query =  "https://" + this.radio_query + this.filterString + "/" + valueLowerCase;
      fetch(this.full_query + "?limit=12" + "&offset=" + this.offset)
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
          //get pathname via url api
          //let pathname = new URL(window.location).pathname;


          window.history.pushState({}, "", window.location.pathname + "?search=" + this.searchString + "&filter=" + this.filterString + "&page=" + (this.offset/12 + 1));        
          
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
    this.onTriggerSearch(value, e); // value !== searchString
  }
  onPageChange(e) {
    //if e.target is an anchor tag and e.target.classList.value has string pagination
    if(e.target.tagName == "A" && e.target.classList.value.includes("pagination") && !e.target.classList.value.includes("is-current")) {
      let value = this.searchString; //Use old searchstring, because user hasn't fetched new search results yet.
      this.searchString = value + "makeDifferentFromValue"; //makes react think that new search string so that fetch condition is met         
      this.onTriggerSearch(value, e); // value !== searchString
    }
  }
  onTotalChannelChange(value) {
    this.totalChannels = value;
  }

  //event for when back button is pressed
  componentDidMount() {
    window.addEventListener("popstate", (e) => {      
      this.resetQuery(); //grab new query params from url
      this.setState(
        (prevState, props) => ({
          loading: true
        })
      );
      console.log("popstate");
      //trigger new fresh search
      this.FreshSearch();
    });
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
          <Search 
            channels={this.channels} 
            onChangeText={this.onTriggerSearch} 
            loading={this.state.loading} 
            onClickToggleState={this.onToggle} 
            filterString={this.filterString}
            searchString={this.searchString}
            />
          {
            this.state.error ? 
            <div className="cards columns is-multiline">                              
              <div className="no-results column is-full p-0">
                <div className="error-msg"> 
                  <h2>Error, probably network problem or all radio api servers are down.</h2> 
                </div>
              </div>
            </div>
            :
            <Cards 
              channels={this.channels}
              loading={this.state.loading} 
              onPageChange={this.onPageChange}                 
              fullQuery={this.full_query}  
              offSet={this.offset}     
              onTotalChannelChange={this.onTotalChannelChange} 
              totalChannels={this.totalChannels} 
            />
          }
          {/* In future find a way to NOT UPDATE/RE_RENDER Cards when this.stateloading changes */}          
        </div> 
      </>
    )
  };
}

//export app2 without default
export {App as App3};




