import { Injectable } from "@nestjs/common";
import {
  QuerySupportListMetaRequestDto,
  QuerySupportListRequestDto,
} from "../dto/query-support-list-request.dto";
import {
  SupportListDeltaResponseDto,
  SupportListFullResponseDto,
  SupportListMetaResponseDto,
} from "../dto/query-support-list-response.dto";
import { SupportListReadService } from "../../../03-fetching/support-list/services/support-list-read.service";

@Injectable()
export class SupportListQueryService {
  constructor(private readonly supportListReadService: SupportListReadService) {}

  async getMeta(
    request: QuerySupportListMetaRequestDto,
  ): Promise<SupportListMetaResponseDto> {
    return await this.supportListReadService.getMeta({
      type: request.type,
    });
  }

  async getSupportList(
    request: QuerySupportListRequestDto,
  ): Promise<SupportListFullResponseDto | SupportListDeltaResponseDto> {
    return await this.supportListReadService.getSupportList({
      type: request.type,
      since: request.since,
      symbols: request.symbols,
    });
  }
}

