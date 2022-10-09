import React from 'react';
import {  CSSTransition, TransitionGroup } from 'react-transition-group';

import AudioPlayer from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';

import { FaExternalLinkAlt } from 'react-icons/fa';
import song from '../songs/song.mp3';

class Cards extends React.Component {
  constructor(props) {
    super(props);
    this.applyInput = this.applyInput.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.onAudioPause = this.onAudioPause.bind(this);
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
  onAudioPause(event) {    
    //event.target.load();
    //this triggers a fresh stream to start, which stops previous stream to keep downloading even after pause
    console.log(22);
  }

  render (){    
    return (
      <TransitionGroup className="cards columns is-multiline">      
        {
          this.props.channels.map(
            (channel, index) => 
              {
                var breakClass = "";
                if(index % 3 == 0) {
                  breakClass = "test"
                }
                return ( 
                <CSSTransition
                    key={channel.changeuuid}                    
                    timeout={300}
                    classNames="item"
                  >
                  <div className={breakClass + " column is-one-third-desktop is-half-tablet"}>
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
                            <audio preload="none" controls src={channel.url_resolved} onPause={this.onAudioPause} onTimeUpdate={(e)=>{console.log(1)}}></audio>
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
                </CSSTransition>
                )
              }
          )
        }
      </TransitionGroup>
      
    )
  }


}

export default Cards;