/* eslint-disable */
// Import modules
import React from "react";
import PropTypes from "prop-types";
// Import components
import ErrorBoundary from "./ErrorBoundary";
import TableCell from "./TableCell";
import Toggles from "./Toggles";
import Paginator from "./Paginator";
import withPagination from "./with-pagination";
// Import functions
import {
  debugPrint,
  fetchData,
  parseDataForColumns,
  parseDataForRows,
  sliceRowsPerPage,
  sortData,
  isEmpty,
  isString,
  isFunction,
  head,
  columnObject
} from "./helpers/functions";
// Import styles
import "./css/basic.css";

class SmartDataTablePlain extends React.Component {
  constructor(props) {
    super(props);
    this.timeout = 0;
    this.state = {
      asyncData: [],
      columns: [],
      colProperties: {},
      sorting: {
        key: "",
        dir: ""
      },
      inputFilter: {},
      activePage: 1,
      isLoading: false,
      localFilteredData: []
    };

    this.handleColumnToggle = this.handleColumnToggle.bind(this);
    this.handleOnPageChange = this.handleOnPageChange.bind(this);
    this.handleRowClick = this.handleRowClick.bind(this);
    // this.handleInputChange = this.handleInputChange.bind(this);
  }

  static getDerivedStateFromProps(props, state) {
    const { filterValue } = props;
    const { prevFilterValue } = state;
    if (filterValue !== prevFilterValue) {
      return {
        activePage: 1,
        prevFilterValue: filterValue
      };
    }
    return null;
  }

  componentDidMount() {
    const { onFilterChange } = this.props;
    this.showWarnings();
    this.fetchData();
    if (!onFilterChange) {
      this.filterLocal();
    }
    this.setColProperties();
  }

  componentDidUpdate(prevProps) {
    const { data, onFilterChange } = this.props;
    const { data: prevData } = prevProps;
    const { localFilteredData } = this.state;
    if (
      isString(data) &&
      (typeof data !== typeof prevData || data !== prevData)
    ) {
      this.fetchData();
      if (!onFilterChange) {
        this.filterLocal();
      }
    }
    if (data !== prevData) {
      // this.fetchData();
      if (!onFilterChange) {
        this.filterLocal();
      }
    }
  }

  setColProperties() {
    const { headers } = this.props;
    this.setState({ colProperties: headers });
  }

  fetchData() {
    const { data, dataKey } = this.props;
    if (isString(data)) {
      this.setState({ isLoading: true });
      fetchData(data, dataKey)
        .then(asyncData => {
          this.setState({
            asyncData,
            isLoading: false,
            columns: this.getColumns(true)
          });
          // if (!onFilterChange) {
          //   this.filterLocal();
          // }
        })
        .catch(debugPrint);
    }
  }

  showWarnings() {
    /* Keeping for future reference
    const { footer, withHeaders } = this.props
    const propError = (oldName, newName) => `
[SmartDataTable] The '${oldName}' prop has been deprecated in v0.6 and is no
longer valid. Consider replacing it with '${newName}'
`
    if (footer) errorPrint(propError('footer', 'withFooter'))
    if (withHeaders) errorPrint(propError('withHeaders', 'withHeader'))
    */
  }

  handleRowClick(event, rowData, rowIndex, tableData) {
    const { onRowClick } = this.props;
    if (onRowClick) {
      onRowClick(event, { rowData, rowIndex, tableData });
    }
  }

  handleColumnToggle(key) {
    const { colProperties } = this.state;
    if (!colProperties[key]) {
      colProperties[key] = {};
    }
    colProperties[key].invisible = !colProperties[key].invisible;
    this.setState({ colProperties });
  }

  handleOnPageChange(event, { activePage }) {
    this.setState({ activePage });
  }

  handleSortChange(column) {
    const { autoSearch, delayedSearch } = this.props;
    const { sorting } = this.state;
    const { key } = column;
    let dir = "";
    if (key !== sorting.key) sorting.dir = "";
    if (sorting.dir) {
      if (sorting.dir === "asc") {
        dir = "desc";
      } else {
        dir = "";
      }
    } else {
      dir = "asc";
    }
    this.setState({
      sorting: {
        key,
        dir
      }
    });
    if (autoSearch) {
      if (this.timeout) clearTimeout(this.timeout);
      this.timeout = setTimeout(() => {
        this.searchInputFilter();
      }, delayedSearch);
    }
  }

  handleInputChange(e) {
    const { autoSearch, delayedSearch } = this.props;
    const { inputFilter } = this.state;
    this.setState({
      inputFilter: {
        ...inputFilter,
        [e.target.name]: e.target.value
      }
    });
    if (autoSearch) {
      if (this.timeout) clearTimeout(this.timeout);
      this.timeout = setTimeout(() => {
        this.searchInputFilter();
      }, delayedSearch);
    }
  }

  searchInputFilter() {
    const { inputFilter, sorting } = this.state;
    const { onFilterChange, data, headers } = this.props;
    if (onFilterChange) {
      onFilterChange(event, { inputFilter, sorting });
    } else {
      // filter here
      this.filterLocal();
    }
  }

  filterLocal() {
    const { inputFilter, sorting } = this.state;
    const { data, headers } = this.props;
    const { dir, key } = sorting;
    let sortedRows = [];

    let res;
    if (!isEmpty(inputFilter)) {
      res = data.filter(d => {
        let flagInput = true;
        for (var key in inputFilter) {
          const temp = d[key];
          if (inputFilter[key] !== "") {
            if (isString(temp)) {
              flagInput = temp.toLowerCase().includes(inputFilter[key]);
            } else {
              tempString = String(temp);
              flagInput = tempString.toLowerCase().includes(inputFilter[key]);
            }
            if (!flagInput) return false;
          }
        }
        return flagInput;
      });
    } else {
      res = data;
    }

    if (dir) {
      if (dir === "asc") {
        sortedRows = sortBy(res, [key]);
      } else {
        sortedRows = sortBy(res, [key]).reverse();
      }
    } else {
      sortedRows = res.slice(0);
    }
    this.setState({
      localFilteredData: sortedRows
    });
  }

  renderSorting(column) {
    const {
      sorting: { key, dir }
    } = this.state;
    let sortingIcon = "rsdt-sortable-icon";
    if (key === column.key) {
      if (dir) {
        if (dir === "asc") {
          sortingIcon = "rsdt-sortable-asc";
        } else {
          sortingIcon = "rsdt-sortable-desc";
        }
      }
    }
    return (
      <i
        className={`rsdt ${sortingIcon}`}
        onClick={() => this.handleSortChange(column)}
        onKeyDown={() => this.handleSortChange(column)}
        role="button"
        tabIndex={0}
        aria-label="sorting column"
      />
    );
  }

  renderHeader(columns) {
    const { colProperties, inputFilters } = this.state;
    const {
      sortable,
      buttonClassName,
      inputClassName,
      autoSearch
    } = this.props;
    const headers = columns.map(column => {
      const thisColProps = colProperties[column.key];
      const showCol = !thisColProps || !thisColProps.invisible;
      if (showCol) {
        return (
          <th key={column.key}>
            <div>
              <span>{column.text}</span>
              <span className="rsdt rsdt-sortable">
                {sortable && column.sortable
                  ? this.renderSorting(column)
                  : null}
              </span>
            </div>
            {column.key === "_action" ? (
              <div>
                {autoSearch ? null : (
                  <button
                    className={buttonClassName}
                    onClick={() => this.searchInputFilter()}
                  >
                    <i className="search icon" />
                    Search
                  </button>
                )}
              </div>
            ) : (
              <div className={inputClassName}>
                <input
                  className="rsdt rsdt-input"
                  onChange={e => this.handleInputChange(e)}
                  type="text"
                  name={column.key}
                  placeholder={column.text}
                ></input>
              </div>
            )}
          </th>
        );
      }
      return null;
    });
    return <tr>{headers}</tr>;
  }

  renderRow(columns, row, i) {
    const { colProperties } = this.state;
    const { withLinks, filterValue, parseBool, parseImg } = this.props;
    return columns.map((column, j) => {
      const thisColProps = { ...colProperties[column.key] };
      const showCol = !thisColProps.invisible;
      const transformFn = thisColProps.transform;
      if (showCol) {
        return (
          <td key={`row-${i}-column-${j}`}>
            {isFunction(transformFn) ? (
              transformFn(row[column.key], i, row)
            ) : (
              <ErrorBoundary>
                <TableCell
                  withLinks={withLinks}
                  filterValue={filterValue}
                  parseBool={parseBool}
                  parseImg={parseImg}
                  filterable={thisColProps.filterable}
                  isImg={thisColProps.isImg}
                >
                  {row[column.key]}
                </TableCell>
              </ErrorBoundary>
            )}
          </td>
        );
      }
      return null;
    });
  }

  renderBody(columns, rows) {
    const { perPage } = this.props;
    const { activePage } = this.state;
    const visibleRows = sliceRowsPerPage(rows, activePage, perPage);
    const tableRows = visibleRows.map((row, i) => (
      <tr key={`row-${i}`} onClick={e => this.handleRowClick(e, row, i, rows)}>
        {this.renderRow(columns, row, i)}
      </tr>
    ));
    return <tbody>{tableRows}</tbody>;
  }

  renderFooter(columns) {
    const { withFooter } = this.props;
    return withFooter ? this.renderHeader(columns) : null;
  }

  renderToggles(columns) {
    const { colProperties } = this.state;
    const { withToggles } = this.props;
    return withToggles ? (
      <ErrorBoundary>
        <Toggles
          columns={columns}
          colProperties={colProperties}
          handleColumnToggle={this.handleColumnToggle}
        />
      </ErrorBoundary>
    ) : null;
  }

  renderPagination(rows) {
    const { perPage, paginator: PaginatorComponent } = this.props;
    const { activePage } = this.state;
    const Paginate = withPagination(PaginatorComponent);
    return perPage && perPage > 0 ? (
      <ErrorBoundary>
        <Paginate
          rows={rows}
          perPage={perPage}
          activePage={activePage}
          onPageChange={this.handleOnPageChange}
        />
      </ErrorBoundary>
    ) : null;
  }

  getColumns(force = false) {
    const { asyncData, columns, localFilteredData } = this.state;
    const {
      data,
      headers,
      orderedHeaders,
      hideUnordered,
      onFilterChange
    } = this.props;
    if (!force && !isEmpty(columns)) return columns;
    const columnsHeader = [];
    if (isEmpty(data) && isEmpty(asyncData)) {
      const headKeys = Object.keys(headers); // get semua key object
      for (let i = 0, N = headKeys.length; i < N; i += 1) {
        const key = headKeys[i];
        columnsHeader.push(columnObject(key, headers));
      }
      return columnsHeader;
    }
    if (isString(data)) {
      return parseDataForColumns(
        asyncData,
        headers,
        orderedHeaders,
        hideUnordered
      );
    }
    return parseDataForColumns(data, headers, orderedHeaders, hideUnordered);
  }

  getRows() {
    const { asyncData, colProperties, sorting, localFilteredData } = this.state;
    const { data, filterValue, onFilterChange } = this.props;
    // stop from sorting

    const notSort = {
      dir: "",
      key: sorting.key
    };
    let tempSort = notSort;
    if (isString(data)) {
      return sortData(
        filterValue,
        colProperties,
        tempSort,
        parseDataForRows(asyncData)
      );
    }
    if (!onFilterChange) {
      return sortData(
        filterValue,
        colProperties,
        tempSort,
        parseDataForRows(localFilteredData)
      );
    }
    return sortData(
      filterValue,
      colProperties,
      tempSort,
      parseDataForRows(data)
    );
  }

  render() {
    const {
      name,
      className,
      withHeader,
      loader,
      dynamic,
      emptyTable
    } = this.props;
    const { isLoading } = this.state;
    const columns = this.getColumns(dynamic);
    const rows = this.getRows();
    const temprows = isEmpty(rows) ? [] : rows;
    return !isLoading ? (
      <div className="rsdt rsdt-container">
        {this.renderToggles(columns)}
        <table data-table-name={name} className={className}>
          {withHeader && <thead>{this.renderHeader(columns)}</thead>}
          {isEmpty(rows) && emptyTable}
          {this.renderBody(columns, temprows)}
          <tfoot>{this.renderFooter(columns)}</tfoot>
        </table>
        {this.renderPagination(rows)}
      </div>
    ) : (
      loader
    );
  }
}

// Defines the type of data expected in each passed prop
SmartDataTablePlain.propTypes = {
  data: PropTypes.oneOfType([PropTypes.string, PropTypes.array]).isRequired,
  dataKey: PropTypes.string,
  columns: PropTypes.array,
  name: PropTypes.string,
  sortable: PropTypes.bool,
  withToggles: PropTypes.bool,
  withLinks: PropTypes.bool,
  withHeader: PropTypes.bool,
  withFooter: PropTypes.bool,
  filterValue: PropTypes.string,
  perPage: PropTypes.number,
  className: PropTypes.string,
  buttonClassName: PropTypes.string,
  inputClassName: PropTypes.string,
  loader: PropTypes.node,
  onRowClick: PropTypes.func,
  onFilterChange: PropTypes.func,
  parseBool: PropTypes.oneOfType([PropTypes.bool, PropTypes.object]),
  parseImg: PropTypes.oneOfType([PropTypes.bool, PropTypes.object]),
  headers: PropTypes.object,
  dynamic: PropTypes.bool,
  emptyTable: PropTypes.node,
  paginator: PropTypes.func,
  orderedHeaders: PropTypes.array,
  hideUnordered: PropTypes.bool,
  autoSearch: PropTypes.bool,
  delayedSearch: PropTypes.number
};

// Defines the default values for not passing a certain prop
SmartDataTablePlain.defaultProps = {
  dataKey: "data",
  columns: [],
  name: "reactsmartdatatable",
  sortable: false,
  withToggles: false,
  withLinks: false,
  withHeader: true,
  withFooter: false,
  filterValue: "",
  perPage: 0,
  className: "",
  buttonClassName: "",
  inputClassName: "",
  loader: null,
  parseBool: false,
  parseImg: false,
  headers: {},
  dynamic: false,
  emptyTable: null,
  paginator: Paginator,
  orderedHeaders: [],
  hideUnordered: false,
  autoSearch: false,
  delayedSearch: 1000
};

const sortBy = (arr, key) =>
  [...arr].sort((a, b) => {
    if (a[key] > b[key]) {
      return 1;
    }
    if (b[key] > a[key]) {
      return -1;
    }
    return 0;
  });

// Wrap the component with an Error Boundary
const SmartDataTable = props => (
  <ErrorBoundary>
    <SmartDataTablePlain {...props} />
  </ErrorBoundary>
);

export default SmartDataTable;
