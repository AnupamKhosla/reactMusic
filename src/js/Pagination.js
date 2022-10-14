//import react
import React from 'react';

class Pagination extends React.Component{
  constructor(props) {
    super(props);
    this.onPageLinkClick = this.onPageLinkClick.bind(this);
  }
  onPageLinkClick(e) {
    this.props.onPageChange(e);
  }
  render (){
    return (
      <nav className="pagination is-centered column is-full" role="navigation" aria-label="pagination" onClick={this.onPageLinkClick}>
        <a className="pagination-previous">Previous</a>
        <a className="pagination-next">Next page</a>
        <ul className="pagination-list">
          <li><a className="pagination-link" aria-label="Goto page 1">1</a></li>
          <li><span className="pagination-ellipsis">&hellip;</span></li>
          <li><a className="pagination-link" aria-label="Goto page 45">45</a></li>
          <li><a className="pagination-link is-current" aria-label="Page 46" aria-current="page">46</a></li>
          <li><a className="pagination-link" aria-label="Goto page 47">47</a></li>
          <li><span className="pagination-ellipsis">&hellip;</span></li>
          <li><a className="pagination-link" aria-label="Goto page 86">86</a></li>
        </ul>
      </nav>
    )
  }
}

//export
export default Pagination;