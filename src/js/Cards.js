import React from 'react';
import {  CSSTransition, SwitchTransition } from 'react-transition-group';

// import AudioPlayer from 'react-h5-audio-player';
// import 'react-h5-audio-player/lib/styles.css'; //use in future to customize audio player

import { FaExternalLinkAlt } from 'react-icons/fa';
import song from '../songs/song.mp3';

import Pagination from './Pagination';

class Cards extends React.Component {
  constructor(props) {
    super(props);
    this.applyInput = this.applyInput.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.onImgError = this.onImgError.bind(this);
  }
  applyInput(event) {    
    //get search input value
    let searchInputValue = document.getElementById("search").value;
    this.props.onChangeText(searchInputValue);
  } 
  handleSubmit(event) {
    this.applyInput();
    //stop form submission
    event.preventDefault();
  }
  onImgError(e) {  
    console.log(e.target);
    var fallback = "data:image/gif;base64,R0lGODlhAQABAIAAAMLCwgAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==";
    if(e.target.src != fallback) {
      e.target.src = fallback;
    }    
  }

  render (){    
    console.log("cards render");
    console.log(this.props.loading)
    return (
      <>
        <SwitchTransition mode='out-in' >  
          <CSSTransition
                key={new Date().getTime() + Math.random()} // This will make sure that the key is changed on every render.
                // r-t-g plugin thinks that new elements have been added, so the transitions kick in.
                // With same keys react thinks that it is the same element, so nothing is added or removed, disallowing transition classes to be added/removed as well.
                timeout={300} // same as .3s transitions in css
                classNames="item"
              > 
                  <div className="cards columns is-multiline">                              
                    <div className="no-results column is-full p-0">
                      <h2>  
                        { //if loading finished and no results found
                          (!this.props.loading && (this.props.channels.length == 0) ) ?  "No results found" : ""
                        }
                      </h2>
                    </div> 

                    {(!this.props.loading && (this.props.channels.length !== 0) ) ? <Pagination onPageChange={this.props.onPageChange}/> : ""}  
                    
                    {
                      this.props.channels.map(
                        (channel, index) => 
                          {
                            var breakClass = "";
                            if(index % 3 == 0) {
                              breakClass = "test"
                            }
                            return (                       
                                <div key={channel.changeuuid} className={breakClass + " column is-one-third-desktop is-half-tablet"}>
                                  <div className="card">                          
                                    <div className="card-content">
                                      <div className="media">
                                        <div className="media-left">
                                          <figure className="image is-48x48">
                                            <img  src={channel.favicon ? channel.favicon : "data:image/gif;base64,R0lGODlhAQABAIAAAMLCwgAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw=="} 
                                            alt="channel logo"
                                            onError={this.onImgError}

                                            />
                                            </figure>
                                          </div>
                                        <div className="media-content">
                                        <h2 className="title is-5">{channel.name}</h2>
                                        <p className="subtitle is-6">
                                          <a href={channel.homepage}>
                                            Official Website <FaExternalLinkAlt className="ext-link" />
                                          </a>
                                        </p>
                                        </div>
                                      </div>
                                      <div className="content wrap">     
                                          {/*preload none is important to force stop downloading data on pause event.*/}
                                          <audio preload="none" controls src={channel.url_resolved} onPause={this.onAudioPause} ></audio>
                                          {/*<AudioPlayer                              
                                            src={channel.url_resolved}
                                            onPlay={e => console.log("onPlay")}
                                            // other props here
                                          />*/}
                                        {/*Customizable audio tag, but backwardf/forward functionality not working*/}                          
                                        <p>Tags: {channel.tags.replaceAll(',', ', ')}</p>
                                        <p>Country: {channel.country}</p>
                                        <p>Country Code: {channel.countrycode}</p>
                                        <p>State: {channel.state}</p>
                                        <p>Language: {channel.language.replaceAll(',', ', ')}</p>  
                                        <p>Codec: {channel.codec}</p>
                                        {/*{JSON.stringify(channel)}*/}
                                                          
                                      </div>
                                    </div>
                                  </div>
                                </div>                      
                            )
                          }
                      )
                    }                          
                  </div>
          </CSSTransition>
        </SwitchTransition>
        
        
      </>
    )
  }


}

export default Cards;