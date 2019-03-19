/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import * as _ from 'lodash';
import {
  Component,
  ElementRef,
  EventEmitter,
  Injector,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges
} from '@angular/core';
import {AbstractComponent} from '../../../../common/component/abstract.component';
import {Shelf} from "../../../../domain/workbook/configurations/shelf/shelf";
import {UIMapOption} from "../../../../common/component/chart/option/ui-option/map/ui-map-chart";
import {LogicalType} from "../../../../domain/datasource/datasource";
import {Alert} from "../../../../common/util/alert.util";
import {ShelveFieldType} from "../../../../common/component/chart/option/define/common";
import {Field as AbstractField, Field } from "../../../../domain/workbook/configurations/field/field";
import {ChartUtil} from "../../../../common/component/chart/option/util/chart-util";

@Component({
  selector: 'map-spatial',
  templateUrl: './map-spatial.component.html'
})
export class MapSpatialComponent extends AbstractComponent implements OnInit, OnDestroy, OnChanges {

  /*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
   | variables
   |-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=*/

  @Output('changeAnalysisNoti')
  private changeAnalysis = new EventEmitter();

  @Input('uiOption')
  public uiOption: UIMapOption;

  @Input('shelf')
  public shelf: Shelf;

  public baseList: any = {'layers': []};
  public baseIndex: number = 0;
  public compareList: any = {'layers': []};
  public compareIndex: number = 0;

  public calSpatialList: any = [
    {name: 'Distance within', value: 'dwithin'}
    , {name: 'With In', value: 'within'}
    , {name: 'Intersection', value: 'intersects'}
    , {name: 'Symmetrical difference', value: 'symmetricdiff'} // 서버상에 현재 키 값이 없음
  ];
  public calSpatialIndex: number = 0;

  public unitList: any = [
    {name: 'Meters', value: 'meters'}
    , {name: 'Kilometers', value: 'kilometers'}
  ];
  public unitIndex: number = 0;

  public unitInput: string = '100';

  // choropleth 관련 사항 (Buffer를 선택시 choropleth를 true로 설정 후 백엔드에 호출)
  public bufferList: any = [
    '100'
    , '200'
    , '300'
    , '400'
    , '500'
    , '700'
    , '1000'
  ];
  public bufferIndex: number;

  // 단계구분도 보기
  public isChoroplethOn: boolean = false;

  // dimension, measure List
  public fieldList : any = {
    measureList    : [],
    dimensionList  : []
  };

  public aggregateTypes = [
    {name : 'SUM', value: 'SUM'},
    {name : 'AVG', value: 'AVG'},
    {name : 'CNT', value: 'COUNT'},
    {name : 'MED', value: 'MEDIAN'},
    {name : 'MIN', value: 'MIN'},
    {name : 'MAX', value: 'MAX'},
    {name : 'PCT1/4', value: 'PCT1/4'}, // 값 확인 필요
    {name : 'PCT3/4', value: 'PCT3/4'}  // 값 확인 필요
  ];
  public selectAggregateType = [{name : this.translateService.instant('msg.comm.ui.please.select'), value: 'SUM'}];

  /*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
   | Constructor
   |-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=*/

  // 생성자
  constructor(protected elementRef: ElementRef,
              protected injector: Injector) {

    super(elementRef, injector);
  }

  /*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
   | Override Method
   |-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=*/

  // Init
  public ngOnInit() {
    // Init
    super.ngOnInit();
  }

  // onChanges
  public ngOnChanges(changes: SimpleChanges): void {
    if (!_.isUndefined(changes) && !_.isUndefined(changes['uiOption'])) {
      this.uiOption = (<UIMapOption>changes['uiOption'].currentValue);
      this.mapSpatialChanges(this.uiOption, this.shelf);
    }
  }

  // Destory
  public ngOnDestroy() {
    // Destory
    super.ngOnDestroy();
  }

  /*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
   | public
   |-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=*/

  public mapSpatialChanges(uiOption, shelf) {
    this.uiOption = <UIMapOption>uiOption;
    this.shelf = shelf;
    this.baseList.layers = [];
    this.compareList.layers = [];
    // 레이어가 추가/제거 될때 자동으로 selectbox의 레이어 선택
    if (!_.isUndefined(this.shelf) && this.shelf.layers.length > 0) {
      let isChanged = false;
      let shelfIndex = 0;
      this.shelf.layers.forEach(layer => {
        if (!_.isUndefined(layer.fields) && layer.fields.length > 0) {
          layer.fields.forEach(field => {
            if (!_.isUndefined(field) && !_.isUndefined(field.field.logicalType)
              && (field.field.logicalType === LogicalType.GEO_POINT || field.field.logicalType === LogicalType.GEO_POLYGON || field.field.logicalType === LogicalType.GEO_LINE)) {
              if (!_.isUndefined(this.uiOption) && !_.isUndefined(this.uiOption.layers)
                && this.uiOption.layers.length > 0 && !_.isUndefined(this.uiOption.layers[shelfIndex].name)) {
                this.baseList.layers.push(this.uiOption.layers[shelfIndex].name);
                if (!isChanged) {
                  this.baseList['selectedNum'] = shelfIndex;
                  isChanged = true;
                }
              }
            }
          });
        }
        shelfIndex++;
      });
      if (this.baseList.layers.length > 1) {
        this.compareList.layers = _.cloneDeep(this.baseList.layers);
        this.compareList.layers.splice(this.baseList['selectedNum'], 1);
        // this.compareList.layers = this.compareList.layers.splice(this.baseList['selectedNum'], 1);
        this.compareIndex = 0;

        this.setMeasureList();
      }
    }
  }

  public onSelectBase(value) {
    this.baseList['selectedNum'] = this.baseList.layers.findIndex((baseItem) => baseItem === value);
    this.baseIndex = this.baseList['selectedNum'];
    this.compareList.layers = [];
    this.compareList.layers = _.cloneDeep(this.baseList.layers);
    this.compareList.layers = _.remove(this.compareList.layers, function (layer) {
      return layer != value;
    });
    this.compareIndex = 0;
    this.changeDetect.detectChanges();
  }

  public onSelectCompare(value) {
    this.compareList['selectedNum'] = this.compareList.layers.findIndex((compareItem) => compareItem === value);
    this.compareIndex = this.compareList['selectedNum'];
  }

  public onSelectSpatial(value) {
    this.calSpatialIndex = this.calSpatialList.findIndex((spatialItem) => spatialItem === value);
  }

  public onSelectUnit(value) {
    this.unitIndex = this.unitList.findIndex((unitItem) => unitItem === value);
  }

  public onSelectBuffer(value) {
    let isNoneInBufferList = false;
    this.bufferList.forEach((buffer) => {
      if (buffer.indexOf('Buffer') >= 0) {
        isNoneInBufferList = true;
      }
    });
    if (isNoneInBufferList == false) {
      this.bufferList.unshift('Buffer');
    }
    this.bufferIndex = this.bufferList.findIndex((bufferItem) => bufferItem === value);
  }

  public choroplethBtn() {
    this.isChoroplethOn = !this.isChoroplethOn;
  }

  /**
   * 공간연산 버튼
   */
  public spatialAnalysisBtn() {

    if (!_.isUndefined(this.uiOption['analysis']) && this.uiOption['analysis']['use'] == true) {
      Alert.warning(this.translateService.instant('msg.page.chart.map.spatial.already'));
      return;
    }

    let spatialDataValue: string = this.calSpatialList[this.calSpatialIndex].value;
    let baseData: string = this.baseList.layers[this.baseIndex];
    let compareData: string = this.compareList.layers[this.compareIndex];

    let bufferData: string = this.bufferList[this.bufferIndex];
    let unitData: string = this.unitList[this.unitIndex].value;

    // Validation
    if (this.spatialAnalysisCommonValidation(baseData, compareData) == false) {
      return;
    }
    let mapUIOption = (<UIMapOption>this.uiOption);
    switch (spatialDataValue) {
      case 'dwithin':
        // Validation
        if (this.spatialAnalysisAdditionalValidation(bufferData, spatialDataValue) == false) {
          return;
        }
        // set data
        mapUIOption = this.dWithinSetData(baseData, compareData, unitData, spatialDataValue, mapUIOption);
        break;
      case 'within':
        // Validation
        if (this.spatialAnalysisAdditionalValidation(bufferData, spatialDataValue) == false) {
          return;
        }
        // set data
        mapUIOption = this.withinOrIntersectsSetData(baseData, compareData, bufferData, spatialDataValue, mapUIOption);
        break;
      case 'intersects':
        // Validation
        if (this.spatialAnalysisAdditionalValidation(bufferData, spatialDataValue) == false) {
          return;
        }
        // set data
        mapUIOption = this.withinOrIntersectsSetData(baseData, compareData, bufferData, spatialDataValue, mapUIOption);
        break;
      case 'symmetricdiff':
        // set data
        mapUIOption = this.symmetricalSetData(baseData, compareData, spatialDataValue, mapUIOption);
        break;
      default:
        Alert.warning(this.translateService.instant('msg.page.chart.map.spatial.select.analysis'));
        return;
    }
    this.changeAnalysis.emit(mapUIOption);
  }

  /**
   * select aggregate type
   * @param item
   */
  public selectAggregate(item) {

    console.info("item : ", item);
    this.selectAggregateType = item;

  }

  /**
   * common analysis validation
   */
  private spatialAnalysisCommonValidation(baseData: string, compareData: string): boolean {
    if (_.isUndefined(baseData)) {
      Alert.warning(this.translateService.instant('msg.page.chart.map.spatial.select.mainlayer'));
      return false;
    }
    if (_.isUndefined(compareData)) {
      Alert.warning(this.translateService.instant('msg.page.chart.map.spatial.select.comparelayer'));
      return false;
    }
    return true;
  }

  /**
   * intersects & distanceWithin validation
   */
  private spatialAnalysisAdditionalValidation(bufferData: string, spatialDataValue: string): boolean {
    if (_.isUndefined(this.unitInput) || this.unitInput.trim() === '' || isNaN(Number(this.unitInput.trim()))) {
      Alert.warning(this.translateService.instant('msg.page.chart.map.spatial.select.range'));
      return false;
    }
    // intersects, within 경우 buffer 값 validation
    if ((spatialDataValue === 'intersects' || spatialDataValue === 'within')
      && (_.isUndefined(bufferData) || bufferData === 'Buffer')) {
      Alert.warning(spatialDataValue + this.translateService.instant('msg.page.chart.map.spatial.select.buffer'));
      return false;
    }
    // within 경우 choropleth 가 true 여야 함
    if (spatialDataValue === 'within' && this.isChoroplethOn == false) {
      Alert.warning(this.translateService.instant('msg.page.chart.map.spatial.select.step'));
      return false;
    }
    return true;
  }

  /**
   * distance within set data
   */
  private dWithinSetData(baseData: string, compareData: string, unitData: string, spatialDataValue: string, mapUIOption: UIMapOption): UIMapOption {

    let unitInputData: number = Number(this.unitInput.trim());
    if (unitData == 'kilometers') {
      unitInputData = unitInputData * 1000;
    }

    mapUIOption.analysis = {
      use: true,
      type: 'geo',
      layerNum: this.baseIndex,
      mainLayer: baseData,
      compareLayer: compareData,
      operation: {
        type: spatialDataValue,
        distance: unitInputData,
        unit: unitData
      }
    };

    // 단계구분도 설정 (단계구분도 = choropleth)
    mapUIOption.analysis['operation']['choropleth'] = this.isChoroplethOn;

    return mapUIOption;
  }

  /**
   * Within & intersects set data
   */
  private withinOrIntersectsSetData(baseData: string, compareData: string, bufferData: string, spatialDataValue: string, mapUIOption: UIMapOption): UIMapOption {

    let bufferDataValue: number = -1;
    if (!_.isUndefined(bufferData) && bufferData !== 'Buffer') {
      bufferDataValue = Number(bufferData);
    }

    mapUIOption.analysis = {
      use: true,
      type: 'geo',
      layerNum: this.baseIndex,
      mainLayer: baseData,
      compareLayer: compareData,
      operation: {
        type: spatialDataValue
      }
    };

    // buffer 설정
    if (bufferDataValue > 0) {
      mapUIOption.analysis['operation']['buffer'] = bufferDataValue;
    }

    // 단계구분도 설정 (단계구분도 = choropleth)
    mapUIOption.analysis['operation']['choropleth'] = this.isChoroplethOn;

    return mapUIOption;
  }

  /**
   * symmetrical set data
   */
  private symmetricalSetData(baseData: string, compareData: string, spatialDataValue: string, mapUIOption: UIMapOption): UIMapOption {
    mapUIOption.analysis = {
      use: true,
      type: 'geo',
      layerNum: this.baseIndex,
      mainLayer: baseData,
      compareLayer: compareData,
      operation: {
        type: spatialDataValue
      }
    };
    return mapUIOption;
  }

  /**
   * 측정값 리스트
   */
  private setMeasureList() {

    let shelf = this.shelf;

    this.fieldList = [];
    let tempObj : object = {};
    let measureList: Field[];
    let dimensionList: Field[];

    for(let index=0; index < shelf.layers.length; index++) {

      if( this.uiOption.layers[index].name != this.baseList.layers[this.baseIndex] ) {
        continue;
      }

      let layers = _.cloneDeep(shelf.layers[index].fields);

      const getShelveReturnField = ((shelve: any, typeList: ShelveFieldType[]): AbstractField[] => {
        const resultList: AbstractField[] = [];
        shelve.map((item) => {
          if ((_.eq(item.type, typeList[0]) || _.eq(item.type, typeList[1])) && (item.field && ('user_expr' === item.field.type || item.field.logicalType && -1 == item.field.logicalType.indexOf('GEO'))) ) {
            item['alias'] = ChartUtil.getAlias(item);
            resultList.push(item);
          }
        });
        return resultList;
      });

      measureList = getShelveReturnField(layers, [ShelveFieldType.MEASURE, ShelveFieldType.CALCULATED]);
      dimensionList = getShelveReturnField(layers, [ShelveFieldType.DIMENSION, ShelveFieldType.TIMESTAMP]);
      tempObj = {
        'measureList'    : measureList,
        'dimensionList'  : dimensionList
      };
      this.fieldList = tempObj;

    }

  }


}