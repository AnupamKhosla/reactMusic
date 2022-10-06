import React from 'react';
import {  CSSTransition, TransitionGroup } from 'react-transition-group';


class Cards extends React.Component {
  constructor(props) {
    super(props);
    this.applyInput = this.applyInput.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
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
                  <div className={breakClass + " column is-one-third"}>
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
                              Official Website
                            </a>
                          </p>
                          </div>
                        </div>
                        <div className="content wrap">
                          <p>
                            <a href={channel.url_resolved} >Live stream</a>
                          </p>
                          <p>Tags: {channel.tags.replaceAll(',', ', ')}</p>
                          <p>Country: {channel.country}</p>
                          <p>Country Code: {channel.countrycode}</p>
                          <p>State: {channel.state}</p>
                          <p>Language: {channel.language}</p>  
                          <p>Code: {channel.codec}</p>
                          {/*{JSON.stringify(channel)}*/}
                          <br />                    
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