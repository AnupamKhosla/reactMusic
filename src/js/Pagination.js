//import react
import React from 'react';
import {  CSSTransition, SwitchTransition } from 'react-transition-group';

class Pagination extends React.Component{
  constructor(props) {
    super(props);      
    this.state = {      
      totalChannels: this.props.totalChannels,
      error: false
    }
       
    if(!this.props.totalChannels) { //totalChannels 0 means new pagination should be created
      fetch(this.props.fullQuery)
        .then(response => {
          if (response.ok) {
            return response.json();
          }
          //set state error true and loading false          
          this.setState({
            error: true
          });
          throw new Error('Something went wrong');  
        })
        .then(data => {          
          //get length of json object 
          this.props.onTotalChannelChange(data.length);                   
          this.setState({
            totalChannels: data.length            
          });
        });  
      
    }

    this.onPageLinkClick = this.onPageLinkClick.bind(this);
  }
  onPageLinkClick(e) {
    this.props.onPageChange(e);
    e.stopPropagation();
    e.preventDefault();
  }
  onTotalChannelChange() {

  }
  render() {

    if(this.state.totalChannels) {
      //Following pagination is generated with the help of copilot artificial intelligence
      //Another way of creating a SIMILAR(not same) pagination is at https://github.com/AnupamKhosla/crimeWiki/blob/main/include/search_code.php#L122 by Anupam khosla
      //this pagination always has 7 links plus prev and next button
      const totalPages = Math.ceil(this.state.totalChannels / 12); //this 12 is same as app.js limit
      let currentPage = (this.props.offSet / 12) + 1; // 0 offset refers to page1
      
      //total  pagination links  excludin prev and next
      let prevPage = <span className="pagination-previous disabled">Previous</span>;
      let paginationLinks = [];
      paginationLinks[0] = null; //always NULL and never used, iterating from 1 to 7
      let nextPage = <span className="pagination-next disabled">Next</span>;


      if(currentPage > 1) {
        prevPage = <a className="pagination-previous" href={"?page=" + (currentPage-1)} onClick={this.onPageLinkClick} data-page={currentPage-1}>Previous</a>;
      }
      if(currentPage < totalPages) {
        nextPage = <a className="pagination-next" href={"?page=" + (currentPage+1)} onClick={this.onPageLinkClick} data-page={currentPage+1}>Next</a>;
      }
      if(totalPages <= 7) { //if 7 or less elemetns then no ... shown
        for(let i=1; i<=totalPages; i++) {
          paginationLinks[i] = <li key={i}><a className={"pagination-link" + (currentPage == i ? " is-current" : "")} href={"?page=" + (currentPage+1)} onClick={this.onPageLinkClick} data-page={i}>{i}</a></li>;
        }
      } else { // if 8 or more pages
        if(currentPage <= 3) { //first ... not shown
          for(let i=1; i<=5; i++) { //P12345*LN
            paginationLinks[i] = <li key={i}><a className={"pagination-link" + (currentPage == i ? " is-current" : "")} href={"?page=" + i} onClick={this.onPageLinkClick} data-page={i}>{i}</a></li>;
          }
          paginationLinks[6] = <li key={6} className="page-item disabled"><span className="pagination-link">...</span></li>;
          paginationLinks[7] = <li key={7} ><a className="pagination-link" href={"?page=" + totalPages} onClick={this.onPageLinkClick} data-page={totalPages}>{totalPages}</a></li>;
        } 
        else if(currentPage > 3 && currentPage < totalPages-2) { // show both ...
          paginationLinks[1] = <li key={1} ><a className="pagination-link" href="?page=1" onClick={this.onPageLinkClick} data-page="1">1</a></li>;
          paginationLinks[2] = <li key={2} className="page-item disabled"><span className="pagination-link">...</span></li>;        
          for(let pageCount=currentPage-1, i=3; pageCount<=currentPage+1; pageCount++, i++) { //P1...345...LN
            paginationLinks[i] = <li key={i}><a className={"pagination-link" + (currentPage == pageCount ? " is-current" : "")} href={"?page=" + pageCount} onClick={this.onPageLinkClick} data-page={pageCount}>{pageCount}</a></li>;
          }
          paginationLinks[6] = <li key={6} className="page-item disabled"><span className="pagination-link">...</span></li>;
          paginationLinks[7] = <li key={7} ><a className="pagination-link" href={"?page=" + totalPages} onClick={this.onPageLinkClick} data-page={totalPages}>{totalPages}</a></li>;
        } 
        else { // show only first ... P1...6789XN
          paginationLinks[1] = <li key={1} ><a className="pagination-link" href="?page=1" onClick={this.onPageLinkClick} data-page="1">1</a></li>;
          paginationLinks[2] = <li key={2} className="page-item disabled"><span className="pagination-link">...</span></li>;        
          for(let pageCount=totalPages-4, i=3; pageCount<=totalPages; pageCount++, i++) {
            paginationLinks[i] = <li key={i}><a className={"pagination-link" + (currentPage == pageCount ? " is-current" : "")} href={"?page=" + pageCount} onClick={this.onPageLinkClick} data-page={pageCount}>{pageCount}</a></li>;
          }
        }
      }


      return (
        <>
          <SwitchTransition mode='out-in' >  
            <CSSTransition key={new Date().getTime() + Math.random()} timeout={3000} classNames="item" >
              <nav className="pagination is-centered column is-full" role="navigation" aria-label="pagination" onClick={this.onPageLinkClick}>
                {prevPage}
                {nextPage}
                <ul className="pagination-list">
                  {
                    paginationLinks.slice(1).map((link, index) => { //add react keys
                      return link;
                    })
                  }  
                </ul>        
              </nav>
            </CSSTransition>
          </SwitchTransition>
        </>
      )
    }
    else if(this.state.error) {
      return (
        <>
          <SwitchTransition mode='out-in' >  
            <CSSTransition key={new Date().getTime() + Math.random()} timeout={300} classNames="item" >
                <nav className="pagination is-centered column is-full" role="navigation" aria-label="pagination" onClick={this.onPageLinkClick}>
                  Error while loading pagination
                </nav>
              </CSSTransition>
          </SwitchTransition>
        </>
      )
    }    
    else {
      return (
        <>
          <SwitchTransition mode='out-in' >  
            <CSSTransition key={new Date().getTime() + Math.random()} timeout={300} classNames="item" >
              <nav className="pagination is-centered column is-full loading" role="navigation" aria-label="pagination" onClick={this.onPageLinkClick}>
                <ul className="pagination-list">            
                  <li><span className="pagination-ellipsis pagination-link animate-loading"> </span></li>            
                </ul>
              </nav>
            </CSSTransition>
          </SwitchTransition>
        </>
      )
    }

  }
}

/*<nav className="pagination is-centered column is-full" role="navigation" aria-label="pagination" onClick={this.onPageLinkClick}>
          <a className="pagination-previous">Previous</a>
          <a className="pagination-next">Next page</a>



          <ul className="pagination-list">
            <li><a className="pagination-link" aria-label="Goto page 1">1</a></li>
            <li><span className="pagination-ellipsis pagination-link">&hellip;</span></li>
            <li><a className="pagination-link" aria-label="Goto page 45">45</a></li>
            <li><a className="pagination-link is-current" aria-label="Page 46" aria-current="page">46</a></li>
            <li><a className="pagination-link" aria-label="Goto page 47">47</a></li>
            <li><span className="pagination-ellipsis pagination-link">&hellip;</span></li>
            <li><a className="pagination-link" aria-label="Goto page 86">86</a></li>
          </ul>
        </nav>
        <nav>*/

//export
export default Pagination;